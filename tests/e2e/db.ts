import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function queryE2eDb<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    const scriptPath = path.resolve(process.cwd(), 'tests/e2e/db-query.php');
    const out = execFileSync('php', [scriptPath, sql, JSON.stringify(params)], {
        encoding: 'utf8',
    });
    return JSON.parse(out) as T[];
}

export function getLaravelLogSize(): number {
    const logPath = path.resolve(process.cwd(), 'storage/logs/laravel.log');
    return fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;
}

export function readLaravelLogFrom(offset: number): string {
    const logPath = path.resolve(process.cwd(), 'storage/logs/laravel.log');
    if (!fs.existsSync(logPath)) {
        return '';
    }
    const stat = fs.statSync(logPath);
    if (stat.size <= offset) {
        return '';
    }
    const fd = fs.openSync(logPath, 'r');
    const buf = Buffer.alloc(stat.size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    return buf.toString('utf8');
}

export function readLaravelLogTail(bytes = 64_000): string {
    const logPath = path.resolve(process.cwd(), 'storage/logs/laravel.log');
    if (!fs.existsSync(logPath)) {
        return '';
    }
    const stat = fs.statSync(logPath);
    const start = Math.max(0, stat.size - bytes);
    const fd = fs.openSync(logPath, 'r');
    const buf = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return buf.toString('utf8');
}
