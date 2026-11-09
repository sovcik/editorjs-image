import { IconPicture } from '@codexteam/icons';
import { make } from './utils/dom';
import type { API } from '@editorjs/editorjs';
import type { ImageConfig } from './types/types';

/**
 * Enumeration representing the different states of the UI.
 */
export enum UiState {
  /** The UI is in an empty state, with no image loaded or being selected. */
  Empty = 'empty',
  /** The UI is in an uploading state, indicating an image is currently being uploaded. */
  Uploading = 'uploading',
  /** The UI is in a filled state, with an image successfully loaded. */
  Filled = 'filled',
}

/**
 * Nodes interface representing various elements in the UI.
 */
interface Nodes {
  /** Wrapper element in the UI (contains image container, caption, and file button) */
  wrapper: HTMLElement;

  /** Container for the image + preloader */
  imageContainer: HTMLElement;

  /** Canvas for the image element + annotation */
  imageCanvas: HTMLElement;

  /** Represents the image element in the UI */
  imageEl?: HTMLImageElement | HTMLVideoElement;

  /** Represents the annotation element in the UI */
  annotationEl: HTMLElement;

  /** Button for selecting files. */
  fileButton: HTMLElement;

  /** Preloader element for the image. */
  imagePreloader: HTMLElement;

  /** Caption element for the image. */
  caption: HTMLElement;
}

/**
 * ConstructorParams interface representing parameters for the Ui class constructor.
 */
interface ConstructorParams {
  /** Editor.js API. */
  api: API;
  /** Configuration for the image. */
  config: ImageConfig;
  /** Callback function for selecting a file. */
  onSelectFile: () => void;
  /** Flag indicating if the UI is in read-only mode. */
  readOnly: boolean;
}

/**
 * Class for working with UI:
 *  - rendering base structure
 *  - show/hide preview
 *  - apply tune view
 */
export default class Ui {
  /** Nodes representing various elements in the UI. */
  public nodes: Nodes;

  /** API instance for Editor.js. */
  private api: API;

  /** Configuration for the image tool. */
  private config: ImageConfig;

  /** Callback function for selecting a file. */
  private onSelectFile: () => void;

  /** Flag indicating if the UI is in read-only mode. */
  private readOnly: boolean;

  /**
   * Constructor for the Ui class.
   * @param params - parameters for constructing the Ui instance.
   */
  constructor({ api, config, onSelectFile, readOnly }: ConstructorParams) {
    this.api = api;
    this.config = config;
    this.onSelectFile = onSelectFile;
    this.readOnly = readOnly;
    this.nodes = {
      wrapper: make('div', [this.CSS.baseClass, this.CSS.wrapper]),
      imageContainer: make('div', [this.CSS.imageContainer]),
      imageCanvas: make('div', [this.CSS.imageCanvas]),
      imageEl: undefined,
      annotationEl: make('div', [this.CSS.annotation]),
      fileButton: this.createFileButton(),
      imagePreloader: make('div', this.CSS.imagePreloader),
      caption: make('div', [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
      }),
    };

    /**
     * Create base structure
     *  <wrapper>
     *    <image-container>
     *      <image-preloader />
     *      <image-canvas>
     *       <image />
     *       <annotation />
     *      </image-canvas>
     *    </image-container>
     *    <caption />
     *    <select-file-button />
     *  </wrapper>
     */
    this.nodes.caption.dataset.placeholder = this.config.captionPlaceholder;

    this.nodes.imageCanvas.appendChild(this.nodes.annotationEl);
    this.nodes.imageContainer.appendChild(this.nodes.imageCanvas);
    this.nodes.imageContainer.appendChild(this.nodes.imagePreloader);
    this.nodes.wrapper.appendChild(this.nodes.imageContainer);
    this.nodes.wrapper.appendChild(this.nodes.caption);
    this.nodes.wrapper.appendChild(this.nodes.fileButton);
  }

  /**
   * Apply visual representation of activated tune
   * @param tuneName - one of available tunes {@link Tunes.tunes}
   * @param status - true for enable, false for disable
   */
  public applyTune(tuneName: string, status: boolean): void {
    const notSupportedTunes = ['rotation', 'annotation'];
    if (notSupportedTunes.includes(tuneName)) {
      return;
    }
    this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${tuneName}`, status);
  }

  public applyRotation(degree: number): void {
    this.nodes.imageCanvas.style.setProperty('transform', `rotate(${degree}deg)`);
    // this.nodes.imageEl!.style.setProperty('transform', `rotate(${degree}deg)`);
    // this.nodes.annotation.style.setProperty('transform', `rotate(${degree}deg)`);
    const width = degree == 90 || degree == 270 ? this.nodes.imageEl!.clientWidth : this.nodes.imageEl!.clientHeight;
    this.nodes.imageContainer.style.setProperty('height', width + 'px');
  }

  /**
   * Set the innerHTML of the container to the provided SVG string
   * @param svgString - SVG content as a string
   */
  public set annotation(svgString: string) {
    this.nodes.annotationEl.innerHTML = svgString;
    this.resizeAnnotationContainer();
  }

  /**
   * Renders tool UI
   */
  public render(): HTMLElement {
    this.toggleStatus(UiState.Empty);

    return this.nodes.wrapper;
  }

  /**
   * Shows uploading preloader
   * @param src - preview source
   */
  public showPreloader(src: string): void {
    this.nodes.imagePreloader.style.backgroundImage = `url(${src})`;

    this.toggleStatus(UiState.Uploading);
  }

  /**
   * Hide uploading preloader
   */
  public hidePreloader(): void {
    this.nodes.imagePreloader.style.backgroundImage = '';
    this.toggleStatus(UiState.Empty);
  }

  /**
   * Shows an image
   * @param url - image source
   */
  public fillImage(url: string): void {
    /**
     * Check for a source extension to compose element correctly: video tag for mp4, img — for others
     */
    const tag = /\.mp4$/.test(url) ? 'VIDEO' : 'IMG';

    const attributes: { [key: string]: string | boolean } = {
      src: url,
      //width: '100%',
      //height: '100%',
    };

    /**
     * We use eventName variable because IMG and VIDEO tags have different event to be called on source load
     * - IMG: load
     * - VIDEO: loadeddata
     */
    let eventName = 'load';

    /**
     * Update attributes and eventName if source is a mp4 video
     */
    if (tag === 'VIDEO') {
      /**
       * Add attributes for playing muted mp4 as a gif
       */
      attributes.autoplay = true;
      attributes.loop = true;
      attributes.muted = true;
      attributes.playsinline = true;

      /**
       * Change event to be listened
       */
      eventName = 'loadeddata';
    }

    /**
     * Compose tag with defined attributes
     */
    if (tag === 'VIDEO') {
      this.nodes.imageEl = make('video', this.CSS.imageEl, attributes) as HTMLVideoElement;
    } else {
      const i = new Image();
      i.src = url;
      i.onload = () => {
        const container = this.nodes.imageCanvas;
        const ratio = i.width / i.height;
        console.log('Image loaded width=', i.width, 'height=', i.height, i.src);
        console.log('Container width=', container.offsetWidth);
        // i.width = container.offsetWidth;
        // i.height = container.offsetWidth / ratio;
        // this.nodes.imageCanvas?.setAttribute('style', `width: ${i.width}px; height: ${i.height}px;`);
      };

      this.nodes.imageEl = make(i, this.CSS.imageEl, attributes) as HTMLImageElement;
      this.resizeAnnotationContainer();
    }

    /**
     * Add load event listener
     */
    this.nodes.imageEl.addEventListener(eventName, () => {
      this.toggleStatus(UiState.Filled);

      /**
       * Preloader does not exists on first rendering with presaved data
       */
      if (this.nodes.imagePreloader !== undefined) {
        this.nodes.imagePreloader.style.backgroundImage = '';
      }
    });

    this.nodes.imageCanvas.appendChild(this.nodes.imageEl);
  }

  /**
   * Shows caption input
   * @param text - caption content text
   */
  public fillCaption(text: string): void {
    if (this.nodes.caption !== undefined) {
      this.nodes.caption.innerHTML = text;
    }
  }

  /**
   * Changes UI status
   * @param status - see {@link Ui.status} constants
   */
  public toggleStatus(status: UiState): void {
    for (const statusType in UiState) {
      if (Object.prototype.hasOwnProperty.call(UiState, statusType)) {
        const state = UiState[statusType as keyof typeof UiState];

        this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${state}`, state === status);
      }
    }
  }

  /**
   * Resize annotation container to match image dimensions
   */
  private resizeAnnotationContainer(): void {
    const image = this.nodes.imageEl as HTMLImageElement | HTMLVideoElement;

    if (image && this.nodes.annotationEl) {
      this.nodes.annotationEl.style.width = `${image.width}px`;
      this.nodes.annotationEl.style.height = `${image.height}px`;
    }
  }

  /**
   * CSS classes
   */
  private get CSS(): Record<string, string> {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      wrapper: 'image-tool',
      imageContainer: 'image-tool__image',
      imageCanvas: 'image-tool__image-canvas',
      imageWrapper: 'image-tool__image-wrapper',
      imagePreloader: 'image-tool__image-preloader',
      imageEl: 'image-tool__image-picture',
      annotation: 'image-tool__image-annotation',
      caption: 'image-tool__caption',
    };
  }

  /**
   * Creates upload-file button
   */
  private createFileButton(): HTMLElement {
    const button = make('div', [this.CSS.button]);
    button.innerHTML = this.config.buttonContent ?? `${IconPicture} ${this.api.i18n.t('Select an Image')}`;
    button.addEventListener('click', () => {
      this.onSelectFile();
    });
    return button;
  }
}
