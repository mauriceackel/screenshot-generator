import fs from 'fs';
import fsPromise from 'fs/promises';
import { Canvas } from 'skia-canvas';
import Screen from './components/screen';
import { OUTPUT_PATH, OUT_HEIGHT, OUT_WIDTH, TEST_PATH, TRAIN_PATH, VALIDATE_PATH } from './config';
import { IntermediateAnnotation, AnnotationType, Classes, Annotation } from './models/annotation';
import { DrawConfig, DrawJob } from './models/jobs';
import { cleanAnnotations, toYolo } from './utils/annotation';
import ZipArchive from 'archiver';
import MacScreen, { MacBackgroundScreen } from './components/mac/mac-screen';
import WinScreen, { WinBackgroundScreen } from './components/win/win-screen';

async function writeOutput(baseFileName: string, canvas: Canvas, annotations: IntermediateAnnotation[], labelLookup: Map<string, number>, type: AnnotationType, width: number, height: number) {
  switch (type) {
    case 'raw':
      {
        // Output image as is
        await fsPromise.writeFile(`${baseFileName}.png`, await canvas.png);

        await fsPromise.writeFile(`${baseFileName}.txt`, JSON.stringify(annotations));

        // Save annotated image
        const annotated = new Canvas(canvas.width, canvas.height);
        const ctx = annotated.getContext('2d');
        ctx.drawImage(canvas.getContext('2d').canvas, 0, 0);
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 12pt serif';
        ctx.textBaseline = 'top';
        annotations.forEach((annotation) => {
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          ctx.fillText(annotation.class, annotation.x, annotation.y);
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

        // Convert string class label to number according to the final label list
        const relabeledAnnotations: Annotation[] = annotations.map((annotation) => {
          if (!labelLookup.has(annotation.class)) throw new Error('Expected label could not be found');

          return {
            ...annotation,
            class: labelLookup.get(annotation.class),
          } as Annotation;
        });

        // Write annotations
        const annotationData = toYolo(relabeledAnnotations, width, height);
        await fsPromise.writeFile(`${baseFileName}.txt`, annotationData);
      }
      break;
  }
}

async function generateScreenshots(outputPath: string, screen: Screen, amount: number, type: AnnotationType) {
  const screenshotJobs = new Array<{ drawJobs: DrawJob[]; config: DrawConfig }>();

  // For each requested screenshot, prepare draw jobs and save in array
  for (let i = 0; i < amount; i++) {
    const config: DrawConfig = {
      annotations: new Array<IntermediateAnnotation>(),
    };
    const drawJobs: DrawJob[] = screen.getDrawJobs(config);
    drawJobs.sort((a, b) => a.zIndex - b.zIndex); // Order by zIndex ascending

    // Clean annotations
    if (config.canvas && config.annotations) {
      config.annotations = cleanAnnotations(config.annotations, config.canvas.width, config.canvas.height);
    }

    screenshotJobs.push({
      config,
      drawJobs,
    });
  }

  // Now that all jobs and hence all annotations are created, extract all annotations from all screenshots
  const combinedAnnotations = screenshotJobs.reduce((res, screenshotJob) => {
    const { annotations } = screenshotJob.config;
    return [...res, ...annotations];
  }, new Array<IntermediateAnnotation>());

  // Get the all the effective, unique labels
  let index = 0;
  const labelLookup = new Map<string, number>();
  combinedAnnotations.forEach((annotation) => {
    if (labelLookup.has(annotation.class)) return;

    labelLookup.set(annotation.class, index++);
  });

  // Now that we got all screenshot jobs and all the actual labels that are used start drawing
  const promises = screenshotJobs.map(async (screenshotJob, i) => {
    const { drawJobs, config } = screenshotJob;
  
    drawJobs.forEach((job) => job.drawFunction(config));
  
    const { canvas, annotations } = config;
    if (canvas && annotations) {
      const baseFileName = `${outputPath}/image_${i}`;
      await writeOutput(baseFileName, canvas, annotations, labelLookup, type, canvas.width, canvas.height);
    }
  });

  await Promise.all(promises);
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
        trainingAmount: 2000,
        backgroundRatio: 1 / 5,
        validationAmount: 400,
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

async function main(runMode: RunMode, screenType: ScreenType) {
  // Prepare output folder
  if (fs.existsSync(OUTPUT_PATH)) {
    fs.rmdirSync(OUTPUT_PATH, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  fs.mkdirSync(TRAIN_PATH, { recursive: true });
  fs.mkdirSync(VALIDATE_PATH, { recursive: true });
  fs.mkdirSync(TEST_PATH, { recursive: true });

  // Setup screen and contents
  const { screen, backgroundScreen } = getScreens(screenType);
  await screen.loadResources();
  await backgroundScreen.loadResources();

  // Start generation
  const { trainingAmount, backgroundRatio, annotationType, validationAmount, testAmount } = getRunConfig(runMode);

  const promises: Promise<void>[] = [];
  promises.push(generateScreenshots(TRAIN_PATH, backgroundScreen, Math.floor(trainingAmount * backgroundRatio), annotationType));
  promises.push(generateScreenshots(TRAIN_PATH, screen, Math.ceil(trainingAmount * (1 - backgroundRatio)), annotationType));

  promises.push(generateScreenshots(VALIDATE_PATH, backgroundScreen, Math.floor(validationAmount * backgroundRatio), annotationType));
  promises.push(generateScreenshots(VALIDATE_PATH, screen, Math.ceil(validationAmount * (1 - backgroundRatio)), annotationType));

  promises.push(generateScreenshots(TRAIN_PATH, screen, testAmount, annotationType));

  try {
    await Promise.all(promises);
  } catch (err) {
    console.log(err);
  }

  // Zip output
  const archive = ZipArchive('zip', { zlib: { level: 9 } });
  const zipStream = fs.createWriteStream(`${OUTPUT_PATH}/data.zip`);
  archive.pipe(zipStream);

  archive.directory(TRAIN_PATH, 'training');
  archive.directory(VALIDATE_PATH, 'validation');
  archive.directory(TEST_PATH, 'test');
  archive.file(`${OUTPUT_PATH}/classes.json`, { name: 'classes.json' });
  archive.finalize();
}

const [runMode, screenType] = process.argv.slice(2);

main(runMode as RunMode, screenType as ScreenType);
