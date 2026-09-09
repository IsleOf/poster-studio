export type PrintSizeLike = {
    label: string;
    width: number;
    height: number;
    ratio: string;
};

export type MapMaskShape = 'circle' | 'heart' | 'house' | 'rect';

export type MapExportTarget = {
    targetPx: number;
    rawTargetPx: number;
    detailScale: number;
    imageSvgSize: number;
    outputScale: number;
};

const SVG_WIDTH = 1200;
const BASE_CAPTURE_PX = 3600;
const DEFAULT_MAX_CAPTURE_PX = 12000;
const EXPORT_SUPERSAMPLE = 1.35;
const MIN_CARTOGRAPHIC_DETAIL_SCALE = 3.4;

export function calculateMapExportTarget({
    printSize,
    dpi,
    maskShape,
    circleSize,
    heartSize,
    houseSize,
    minPx = BASE_CAPTURE_PX,
    maxPx = DEFAULT_MAX_CAPTURE_PX,
}: {
    printSize: PrintSizeLike;
    dpi: number;
    maskShape: MapMaskShape;
    circleSize: number;
    heartSize: number;
    houseSize: number;
    minPx?: number;
    maxPx?: number;
}): MapExportTarget {
    const [rW, rH] = printSize.ratio.split('/').map(Number);
    const svgHeight = SVG_WIDTH / (rW / rH);
    const outputScale = Math.round(printSize.width * dpi) / SVG_WIDTH;

    const rectMapPad = SVG_WIDTH * 0.0625;
    const rectMapInnerWidth = SVG_WIDTH - 2 * rectMapPad;
    const baseMapRadius = Math.min(SVG_WIDTH, svgHeight) * 0.4;
    const mapRadius = maskShape === 'rect'
        ? rectMapInnerWidth / 2
        : baseMapRadius * (
            maskShape === 'circle' ? circleSize :
            maskShape === 'heart' ? heartSize :
            houseSize
        );

    // VectorStarMap deliberately draws the map image larger than the visible clip
    // so users can drag/reposition it. Export the full draggable image, not just
    // the clipped viewport, otherwise moved maps get upscaled at print time.
    const imageSvgSize = mapRadius * 3;
    const rawTargetPx = Math.ceil(imageSvgSize * outputScale);
    const supersampledTargetPx = Math.ceil(rawTargetPx * EXPORT_SUPERSAMPLE);
    const targetPx = Math.max(minPx, Math.min(maxPx, supersampledTargetPx));

    return {
        targetPx,
        rawTargetPx,
        // Pixel count controls sharpness; detailScale controls vector-tile street
        // density. Keep density consistent across sizes so 5x7/8x10 are not
        // simplified compared with A1/24x36.
        detailScale: Math.max(MIN_CARTOGRAPHIC_DETAIL_SCALE, targetPx / BASE_CAPTURE_PX),
        imageSvgSize,
        outputScale,
    };
}
