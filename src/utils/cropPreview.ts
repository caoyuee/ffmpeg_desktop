export function calculateContainSize(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): { width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return {
      width: Math.max(0, Math.floor(contentWidth)),
      height: Math.max(0, Math.floor(contentHeight)),
    }
  }

  const scale = Math.min(
    containerWidth / contentWidth,
    containerHeight / contentHeight,
    1,
  )

  return {
    width: Math.max(1, Math.floor(contentWidth * scale)),
    height: Math.max(1, Math.floor(contentHeight * scale)),
  }
}
