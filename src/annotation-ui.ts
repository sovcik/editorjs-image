/**
 * Annotation UI - Drawing controls and SVG overlay
 */

import { COLORS, COLORS_ARRAY, DEFAULT_SVG_HEIGHT, DEFAULT_SVG_WIDTH, LINE_WIDTHS } from "./types/types";



export class AnnotationUI {
  private svgElement: SVGSVGElement | null = null;
  private annotationOverlay: HTMLDivElement | null = null;
  private currentPath: SVGPathElement | null = null;
  private isDrawing = false;
  private currentColor = COLORS.col1;
  private currentLineWidth = LINE_WIDTHS[2]; // Default to 5px
  private drawingPoints: string[] = [];
  private eventHandlers: {
    mousedown?: (e: MouseEvent) => void;
    mousemove?: (e: MouseEvent) => void;
    mouseup?: () => void;
    mouseleave?: () => void;
    touchstart?: (e: TouchEvent) => void;
    touchmove?: (e: TouchEvent) => void;
    touchend?: () => void;
  } = {};

  setupAnnotationLayer(imageContainer: HTMLElement, existingAnnotations?: string): void {
    const img = imageContainer.querySelector('img');
    if (!img) return;

    // Create annotation overlay
    this.annotationOverlay = document.createElement('div');
    this.annotationOverlay.style.position = 'absolute';
    this.annotationOverlay.style.top = '0';
    this.annotationOverlay.style.left = '0';
    this.annotationOverlay.style.width = '100%';
    this.annotationOverlay.style.height = '100%';
    this.annotationOverlay.style.pointerEvents = 'none';

    // Create SVG element for annotations
    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgElement.style.width = '100%';
    this.svgElement.style.height = '100%';
    this.svgElement.style.position = 'absolute';
    this.svgElement.style.top = '0';
    this.svgElement.style.left = '0';
    const imgElement = img as HTMLImageElement;
    this.svgElement.setAttribute(
      'viewBox',
      `0 0 ${imgElement.naturalWidth || DEFAULT_SVG_WIDTH} ${imgElement.naturalHeight || DEFAULT_SVG_HEIGHT}`
    );
    this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Load existing annotations - sanitize by parsing and re-creating
    if (existingAnnotations) {
      this.loadAnnotations(existingAnnotations);
    }

    this.annotationOverlay.appendChild(this.svgElement);

    // Position relative to image
    const imgParent = img.parentElement;
    if (imgParent) {
      imgParent.style.position = 'relative';
      imgParent.appendChild(this.annotationOverlay);
    }
  }

  private loadAnnotations(annotationsString: string): void {
    if (!this.svgElement) return;

    try {
      // Parse the SVG string safely
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(annotationsString, 'image/svg+xml');

      // Check for parsing errors
      const parserError = svgDoc.querySelector('parsererror');
      if (!parserError) {
        // Import the parsed nodes into our SVG
        const paths = svgDoc.querySelectorAll('path');
        paths.forEach((path) => {
          const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          newPath.setAttribute('d', path.getAttribute('d') || '');
          newPath.setAttribute('stroke', path.getAttribute('stroke') || '#000000');
          newPath.setAttribute('stroke-width', path.getAttribute('stroke-width') || '1');
          newPath.setAttribute('fill', 'none');
          newPath.setAttribute('stroke-linecap', 'round');
          newPath.setAttribute('stroke-linejoin', 'round');
          this.svgElement?.appendChild(newPath);
        });
      }
    } catch (error) {
      console.error('Failed to parse annotations:', error);
    }
  }

  enableDrawing(): void {
    if (!this.svgElement || !this.annotationOverlay) return;

    this.annotationOverlay.style.pointerEvents = 'auto';
    this.annotationOverlay.style.cursor = 'crosshair';

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      if (!this.svgElement) return null;

      const rect = this.svgElement.getBoundingClientRect();
      const viewBox = this.svgElement.viewBox.baseVal;

      let clientX: number, clientY: number;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        // Check if touches exist and has at least one touch
        if (!e.touches?.length) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      const x = ((clientX - rect.left) / rect.width) * viewBox.width;
      const y = ((clientY - rect.top) / rect.height) * viewBox.height;

      return { x, y };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!this.svgElement) return;

      this.isDrawing = true;
      this.drawingPoints = [];

      const coords = getCoordinates(e);
      if (!coords) return;

      this.drawingPoints.push(`M ${coords.x} ${coords.y}`);

      this.currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.currentPath.setAttribute('stroke', this.currentColor);
      this.currentPath.setAttribute('stroke-width', this.currentLineWidth.toString());
      this.currentPath.setAttribute('fill', 'none');
      this.currentPath.setAttribute('stroke-linecap', 'round');
      this.currentPath.setAttribute('stroke-linejoin', 'round');
      this.svgElement.appendChild(this.currentPath);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!this.isDrawing || !this.currentPath) return;
      e.preventDefault();

      const coords = getCoordinates(e);
      if (!coords) return;

      this.drawingPoints.push(`L ${coords.x} ${coords.y}`);
      this.currentPath.setAttribute('d', this.drawingPoints.join(' '));
    };

    const stopDrawing = () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.currentPath = null;
      }
    };

    // Store event handlers for later removal
    this.eventHandlers.mousedown = startDrawing as (e: MouseEvent) => void;
    this.eventHandlers.mousemove = draw as (e: MouseEvent) => void;
    this.eventHandlers.mouseup = stopDrawing;
    this.eventHandlers.mouseleave = stopDrawing;
    this.eventHandlers.touchstart = startDrawing as (e: TouchEvent) => void;
    this.eventHandlers.touchmove = draw as (e: TouchEvent) => void;
    this.eventHandlers.touchend = stopDrawing;

    this.annotationOverlay.addEventListener('mousedown', this.eventHandlers.mousedown);
    this.annotationOverlay.addEventListener('mousemove', this.eventHandlers.mousemove);
    this.annotationOverlay.addEventListener('mouseup', this.eventHandlers.mouseup);
    this.annotationOverlay.addEventListener('mouseleave', this.eventHandlers.mouseleave);

    this.annotationOverlay.addEventListener('touchstart', this.eventHandlers.touchstart);
    this.annotationOverlay.addEventListener('touchmove', this.eventHandlers.touchmove);
    this.annotationOverlay.addEventListener('touchend', this.eventHandlers.touchend);
  }

  disableDrawing(): void {
    if (!this.annotationOverlay) return;

    this.annotationOverlay.style.pointerEvents = 'none';
    this.annotationOverlay.style.cursor = 'default';

    // Remove all event listeners
    if (this.eventHandlers.mousedown) {
      this.annotationOverlay.removeEventListener('mousedown', this.eventHandlers.mousedown);
    }
    if (this.eventHandlers.mousemove) {
      this.annotationOverlay.removeEventListener('mousemove', this.eventHandlers.mousemove);
    }
    if (this.eventHandlers.mouseup) {
      this.annotationOverlay.removeEventListener('mouseup', this.eventHandlers.mouseup);
    }
    if (this.eventHandlers.mouseleave) {
      this.annotationOverlay.removeEventListener('mouseleave', this.eventHandlers.mouseleave);
    }
    if (this.eventHandlers.touchstart) {
      this.annotationOverlay.removeEventListener('touchstart', this.eventHandlers.touchstart);
    }
    if (this.eventHandlers.touchmove) {
      this.annotationOverlay.removeEventListener('touchmove', this.eventHandlers.touchmove);
    }
    if (this.eventHandlers.touchend) {
      this.annotationOverlay.removeEventListener('touchend', this.eventHandlers.touchend);
    }

    // Clear event handlers
    this.eventHandlers = {};
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  setLineWidth(width: number): void {
    this.currentLineWidth = width;
  }

  clearAnnotations(): void {
    if (this.svgElement) {
      this.svgElement.innerHTML = '';
    }
  }

  getAnnotations(): string {
    return this.svgElement?.innerHTML || '';
  }

  hasBeenInitialized(): boolean {
    return this.svgElement !== null;
  }

  createToolUI(
    onEnableDrawing: () => void,
    onDisableDrawing: () => void,
    onClear: () => void
  ): HTMLElement {
    const container = document.createElement('div');
    container.style.padding = '10px';
    container.style.background = '#fff';
    container.style.border = '1px solid #e0e0e0';
    container.style.borderRadius = '4px';
    container.style.marginTop = '10px';

    // Color picker
    const colorLabel = document.createElement('div');
    colorLabel.textContent = 'Color:';
    colorLabel.style.marginBottom = '5px';
    colorLabel.style.fontWeight = 'bold';
    container.appendChild(colorLabel);

    const colorPicker = document.createElement('div');
    colorPicker.style.display = 'flex';
    colorPicker.style.gap = '5px';
    colorPicker.style.marginBottom = '10px';

    COLORS_ARRAY.forEach((color) => {
      const colorBtn = document.createElement('button');
      colorBtn.style.width = '30px';
      colorBtn.style.height = '30px';
      colorBtn.style.border = '2px solid #ccc';
      colorBtn.style.borderRadius = '4px';
      colorBtn.style.backgroundColor = COLORS[color];
      colorBtn.style.cursor = 'pointer';
      colorBtn.title = color;

      if (COLORS[color] === this.currentColor) {
        colorBtn.style.borderColor = '#000';
        colorBtn.style.borderWidth = '3px';
      }

      colorBtn.onclick = () => {
        this.setColor(COLORS[color]);
        // Update all color buttons
        Array.from(colorPicker.children).forEach((btn) => {
          (btn as HTMLElement).style.borderColor = '#ccc';
          (btn as HTMLElement).style.borderWidth = '2px';
        });
        colorBtn.style.borderColor = '#000';
        colorBtn.style.borderWidth = '3px';
      };

      colorPicker.appendChild(colorBtn);
    });

    container.appendChild(colorPicker);

    // Line width picker
    const widthLabel = document.createElement('div');
    widthLabel.textContent = 'Line Width:';
    widthLabel.style.marginBottom = '5px';
    widthLabel.style.fontWeight = 'bold';
    container.appendChild(widthLabel);

    const widthPicker = document.createElement('div');
    widthPicker.style.display = 'flex';
    widthPicker.style.gap = '5px';
    widthPicker.style.marginBottom = '10px';

    LINE_WIDTHS.forEach((width) => {
      const widthBtn = document.createElement('button');
      widthBtn.textContent = `${width}px`;
      widthBtn.style.padding = '5px 10px';
      widthBtn.style.border = '2px solid #ccc';
      widthBtn.style.borderRadius = '4px';
      widthBtn.style.cursor = 'pointer';
      widthBtn.style.backgroundColor = '#fff';

      if (width === this.currentLineWidth) {
        widthBtn.style.borderColor = '#000';
        widthBtn.style.borderWidth = '3px';
      }

      widthBtn.onclick = () => {
        this.setLineWidth(width);
        // Update all width buttons
        Array.from(widthPicker.children).forEach((btn) => {
          (btn as HTMLElement).style.borderColor = '#ccc';
          (btn as HTMLElement).style.borderWidth = '2px';
        });
        widthBtn.style.borderColor = '#000';
        widthBtn.style.borderWidth = '3px';
      };

      widthPicker.appendChild(widthBtn);
    });

    container.appendChild(widthPicker);

    // Draw/Stop buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';

    const drawBtn = document.createElement('button');
    drawBtn.textContent = 'Start Drawing';
    drawBtn.style.padding = '8px 16px';
    drawBtn.style.border = 'none';
    drawBtn.style.borderRadius = '4px';
    drawBtn.style.backgroundColor = '#4CAF50';
    drawBtn.style.color = 'white';
    drawBtn.style.cursor = 'pointer';
    drawBtn.onclick = () => {
      onEnableDrawing();
      drawBtn.disabled = true;
      stopBtn.disabled = false;
    };

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop Drawing';
    stopBtn.style.padding = '8px 16px';
    stopBtn.style.border = 'none';
    stopBtn.style.borderRadius = '4px';
    stopBtn.style.backgroundColor = '#f44336';
    stopBtn.style.color = 'white';
    stopBtn.style.cursor = 'pointer';
    stopBtn.disabled = true;
    stopBtn.onclick = () => {
      onDisableDrawing();
      drawBtn.disabled = false;
      stopBtn.disabled = true;
    };

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Annotations';
    clearBtn.style.padding = '8px 16px';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '4px';
    clearBtn.style.backgroundColor = '#ff9800';
    clearBtn.style.color = 'white';
    clearBtn.style.cursor = 'pointer';
    clearBtn.onclick = () => {
      onClear();
    };

    buttonContainer.appendChild(drawBtn);
    buttonContainer.appendChild(stopBtn);
    buttonContainer.appendChild(clearBtn);
    container.appendChild(buttonContainer);

    return container;
  }
}
