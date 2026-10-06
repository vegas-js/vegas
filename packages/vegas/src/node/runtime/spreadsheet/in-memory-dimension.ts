export function remapDeletedDimensionPositions(
  positions: ReadonlySet<number>,
  start: number,
  count: number,
): Set<number> {
  const end = start + count - 1;
  const remapped = new Set<number>();

  for (const position of positions) {
    if (position < start) {
      remapped.add(position);
    } else if (position > end) {
      remapped.add(position - count);
    }
  }

  return remapped;
}

export function remapInsertedDimensionPositions(
  positions: ReadonlySet<number>,
  start: number,
  count: number,
): Set<number> {
  return new Set(
    [...positions].map((position) => (position >= start ? position + count : position)),
  );
}

export function remapMovedDimensionPosition(
  position: number,
  sourceStart: number,
  sourceCount: number,
  destinationIndex: number,
): number {
  const sourceEnd = sourceStart + sourceCount - 1;

  // Google documents destination coordinates before source removal but not destinations that fall
  // inside the source span. Vegas treats every boundary from sourceStart through sourceEnd + 1 as
  // a no-op because reinserting the same block at one of its own boundaries preserves its order.
  if (destinationIndex >= sourceStart && destinationIndex <= sourceEnd + 1) {
    return position;
  }

  if (destinationIndex < sourceStart) {
    if (position >= sourceStart && position <= sourceEnd) {
      return destinationIndex + (position - sourceStart);
    }
    if (position >= destinationIndex && position < sourceStart) {
      return position + sourceCount;
    }
    return position;
  }

  if (position >= sourceStart && position <= sourceEnd) {
    return destinationIndex - sourceCount + (position - sourceStart);
  }
  if (position > sourceEnd && position < destinationIndex) {
    return position - sourceCount;
  }

  return position;
}

export function remapMovedDimensionPositions(
  positions: ReadonlySet<number>,
  sourceStart: number,
  sourceCount: number,
  destinationIndex: number,
): Set<number> {
  return new Set(
    [...positions].map((position) =>
      remapMovedDimensionPosition(position, sourceStart, sourceCount, destinationIndex),
    ),
  );
}
