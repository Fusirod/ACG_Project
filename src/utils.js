import { mapLayout } from './constants.js';

export const isWalkable = (r, c) => {
    // Teleport tunnel logic (Hàng 10)
    if (r === 10) {
        if (c === -1 || c === mapLayout[0].length) return true;
    }
    if (r < 0 || r >= mapLayout.length || c < 0 || c >= mapLayout[0].length) return false;
    return mapLayout[r][c] !== 1;
};

// Check if cell is within ghost's assigned quadrant
export const isWalkableInQuadrant = (r, c, q) => {
    if (!isWalkable(r, c)) return false;
    return (r >= q.rMin && r <= q.rMax && c >= q.cMin && c <= q.cMax);
};

export const bfsMove = (startR, startC, targetR, targetC) => {
    const queue = [{ r: startR, c: startC, path: [] }];
    const visited = new Set([`${startR},${startC}`]);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
        const { r, c, path } = queue.shift();
        if (r === targetR && c === targetC) return path.length > 0 ? path[0] : null;

        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (isWalkable(nr, nc) && !visited.has(`${nr},${nc}`)) {
                visited.add(`${nr},${nc}`);
                queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
            }
        }
    }
    return null;
};
