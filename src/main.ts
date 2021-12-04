import fs from 'fs';
import fsPromise from 'fs/promises';
import { Canvas } from 'skia-canvas';
import Screen from './components/screen';
import { OUTPUT_PATH, OUT_HEIGHT, OUT_WIDTH, TEST_PATH, TRAIN_PATH, VALIDATE_PATH } from './config';
import { Annotation, AnnotationType } from './models/annotation';
import { DrawConfig, DrawJob } from './models/jobs';
import { cleanAnnotations, toYolo } from './utils/annotation';
import ZipArchive from 'archiver';
import MacScreen, { MacBackgroundScreen } from './components/mac/mac-screen';
import WinScreen, { WinBackgroundScreen } from './components/win/win-screen';
import { MacClasses, WinClasses } from './models/classes';

async function writeOutput(baseFileName: string, canvas: Canvas, annotations: Annotation[], type: AnnotationType) {
  switch (type) {
    case 'raw':
      {
        // Output image as is
        await fsPromise.writeFile(`${baseFileName}.png`, await canvas.png);

        // Save annotation
        const cleanedAnnotations = cleanAnnotations(annotations, canvas.width, canvas.height);
        await fsPromise.writeFile(`${baseFileName}.txt`, JSON.stringify(cleanedAnnotations));

        // Save annotated image
        const annotated = new Canvas(canvas.width, canvas.height);
        const ctx = annotated.getContext('2d');
        ctx.drawImage(canvas.getContext('2d').canvas, 0, 0);
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 12pt serif';
        ctx.textBaseline = 'top';

        let classes: string[];
        switch (screenType) {
          case 'mac':
            classes = Object.keys(MacClasses).reduce<string[]>((out, key) => (!Number.isNaN(Number.parseInt(key)) ? out : [...out, key.toLowerCase()]), new Array<string>());
            break;
          case 'windows':
            classes = Object.keys(WinClasses).reduce<string[]>((out, key) => (!Number.isNaN(Number.parseInt(key)) ? out : [...out, key.toLowerCase()]), new Array<string>());
            break;
          default:
            throw new Error('Unknown screen type');
        }
        cleanedAnnotations.forEach((annotation) => {
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          ctx.fillText(classes[annotation.class], annotation.x, annotation.y);
        });
        
        await fsPromise.writeFile(`${baseFileName}_annotated.png`, await annotated.png);
      }
      break;
    case 'yolo':
      {
        // Resize image to square
        const outputImage = new Canvas(OUT_WIDTH, OUT_HEIGHT);
        const ctx = outputImage.getContext('2d');
        ctx.drawImage(canvas.getContext('2d').canvas, 0, 0, outputImage.width, outputImage.height);
        await fsPromise.writeFile(`${baseFileName}.png`, await outputImage.png);

        // Convert annotations to Yolo format
        const cleanedAnnotations = cleanAnnotations(annotations, canvas.width, canvas.height);
        const annotationData = toYolo(cleanedAnnotations, canvas.width, canvas.height);
        await fsPromise.writeFile(`${baseFileName}.txt`, annotationData);
      }
      break;
  }
}

async function generateScreen(outputPath: string, screen: Screen, i: number, type: AnnotationType) {
  const config: DrawConfig = {
    annotations: new Array<Annotation>(),
  };
  const jobs: DrawJob[] = screen.getDrawJobs(config);
  jobs.sort((a, b) => a.zIndex - b.zIndex); // Order by zIndex ascending

  jobs.forEach((job) => job.drawFunction(config));

  const { canvas, annotations } = config;

  if (canvas && annotations) {
    const baseFileName = `${outputPath}/image_${i}`;
    await writeOutput(baseFileName, canvas, annotations, type);
  }
}

type RunMode = 'prod' | 'test';
interface RunConfig {
  annotationType: AnnotationType;
  trainingAmount: number;
  backgroundRatio: number;
  validationAmount: number;
  testAmount: number;
}

function getRunConfig(runMode: RunMode): RunConfig {
  switch (runMode) {
    case 'test':
      return {
        annotationType: 'raw',
        trainingAmount: 10,
        backgroundRatio: 1 / 10,
        validationAmount: 0,
        testAmount: 0,
      };
    case 'prod':
      return {
        annotationType: 'yolo',
        trainingAmount: 4000,
        backgroundRatio: 1 / 10,
        validationAmount: 500,
        testAmount: 10,
      };
    default:
      throw new Error(`Unknown running mode ${runMode}`);
  }
}

type ScreenType = 'mac' | 'windows';
interface Screens {
  screen: Screen;
  backgroundScreen: Screen;
}

function getScreens(screenType: ScreenType): Screens {
  switch (screenType) {
    case 'mac':
      return {
        screen: new MacScreen(),
        backgroundScreen: new MacBackgroundScreen(),
      };
    case 'windows':
      return {
        screen: new WinScreen(),
        backgroundScreen: new WinBackgroundScreen(),
      };
    default:
      throw new Error(`Unknown screen type ${screenType}`);
  }
}

async function main(runMode: RunMode, screenType: ScreenType, outputPath = OUTPUT_PATH) {
  // Prepare output folder
  if (fs.existsSync(outputPath)) {
    fs.rmdirSync(outputPath, { recursive: true });
  }
  fs.mkdirSync(outputPath, { recursive: true });
  fs.mkdirSync(`${outputPath}/${TRAIN_PATH}`, { recursive: true });
  fs.mkdirSync(`${outputPath}/${VALIDATE_PATH}`, { recursive: true });
  fs.mkdirSync(`${outputPath}/${TEST_PATH}`, { recursive: true });

  // Write labels
  let classes: string[];
  switch (screenType) {
    case 'mac':
      classes = Object.keys(MacClasses).reduce<string[]>((out, key) => (!Number.isNaN(Number.parseInt(key)) ? out : [...out, key.toLowerCase()]), new Array<string>());
      break;
    case 'windows':
      classes = Object.keys(WinClasses).reduce<string[]>((out, key) => (!Number.isNaN(Number.parseInt(key)) ? out : [...out, key.toLowerCase()]), new Array<string>());
      break;
    default:
      throw new Error('Unknown screen type');
  }
  await fsPromise.writeFile(`${outputPath}/classes.json`, JSON.stringify(classes));

  // Setup screen and contents
  const { screen, backgroundScreen } = getScreens(screenType);
  await screen.loadResources();
  await backgroundScreen.loadResources();

  // Start generation
  const { trainingAmount, backgroundRatio, annotationType, validationAmount, testAmount } = getRunConfig(runMode);

  const promises: Promise<void>[] = [];
  for (let i = 0; i < trainingAmount; i++) {
    if (i < trainingAmount * backgroundRatio) {
      promises.push(generateScreen(`${outputPath}/${TRAIN_PATH}`, backgroundScreen, i, annotationType));
    } else {
      promises.push(generateScreen(`${outputPath}/${TRAIN_PATH}`, screen, i, annotationType));
    }
  }
  for (let i = 0; i < validationAmount; i++) {
    if (i < validationAmount * backgroundRatio) {
      promises.push(generateScreen(`${outputPath}/${VALIDATE_PATH}`, backgroundScreen, i, annotationType));
    } else {
      promises.push(generateScreen(`${outputPath}/${VALIDATE_PATH}`, screen, i, annotationType));
    }
  }
  for (let i = 0; i < testAmount; i++) {
    promises.push(generateScreen(`${outputPath}/${TEST_PATH}`, screen, i, annotationType));
  }

  try {
    await Promise.all(promises);
  } catch (err) {
    console.log(err);
  }

  // Zip output
  const archive = ZipArchive('zip', { zlib: { level: 9 } });
  const zipStream = fs.createWriteStream(`${outputPath}/data.zip`);
  archive.pipe(zipStream);

  archive.directory(`${outputPath}/${TRAIN_PATH}`, 'training');
  archive.directory(`${outputPath}/${VALIDATE_PATH}`, 'validation');
  archive.directory(`${outputPath}/${TEST_PATH}`, 'test');
  archive.file(`${outputPath}/classes.json`, { name: 'classes.json' });
  archive.finalize();
}

const [runMode, screenType, outputPath] = process.argv.slice(2);

main(runMode as RunMode, screenType as ScreenType, outputPath);
