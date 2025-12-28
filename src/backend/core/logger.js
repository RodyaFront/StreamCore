import { performance } from 'perf_hooks';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

class Logger {
    constructor() {
        this.startTime = performance.now();
        this.timings = new Map();
        this.spinners = new Map();
        this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.spinnerInterval = null;
    }

    color(text, colorName) {
        return `${colors[colorName] || ''}${text}${colors.reset}`;
    }

    success(message, details = '') {
        const icon = this.color('✓', 'green');
        const text = this.color(message, 'green');
        const detail = details ? this.color(` (${details})`, 'dim') : '';
        console.log(`${icon} ${text}${detail}`);
    }

    error(message, details = '') {
        const icon = this.color('✗', 'red');
        const text = this.color(message, 'red');
        const detail = details ? this.color(` (${details})`, 'dim') : '';
        console.log(`${icon} ${text}${detail}`);
    }

    warning(message, details = '') {
        const icon = this.color('⚠', 'yellow');
        const text = this.color(message, 'yellow');
        const detail = details ? this.color(` (${details})`, 'dim') : '';
        console.log(`${icon} ${text}${detail}`);
    }

    info(message, details = '') {
        const icon = this.color('ℹ', 'cyan');
        const text = this.color(message, 'cyan');
        const detail = details ? this.color(` (${details})`, 'dim') : '';
        console.log(`${icon} ${text}${detail}`);
    }

    section(title) {
        console.log('');
        const line = '═'.repeat(50);
        const coloredLine = this.color(line, 'dim');
        const coloredTitle = this.color(title, 'bright');
        console.log(coloredLine);
        console.log(`  ${coloredTitle}`);
        console.log(coloredLine);
    }

    startTiming(label) {
        this.timings.set(label, performance.now());
    }

    endTiming(label) {
        const start = this.timings.get(label);
        if (start) {
            const duration = performance.now() - start;
            this.timings.delete(label);
            return duration;
        }
        return 0;
    }

    timedSuccess(message, label, details = '') {
        const duration = this.endTiming(label);
        const timeStr = duration > 0 ? this.color(`[${duration.toFixed(0)}ms]`, 'dim') : '';
        const icon = this.color('✓', 'green');
        const text = this.color(message, 'green');
        const detail = details ? this.color(` (${details})`, 'dim') : '';
        console.log(`${icon} ${text}${detail} ${timeStr}`);
    }

    spinner(id, message) {
        if (this.spinners.has(id)) {
            return;
        }

        this.spinners.set(id, { message, frame: 0 });

        if (!this.spinnerInterval) {
            this.spinnerInterval = setInterval(() => {
                this.updateSpinners();
            }, 100);
        }
    }

    stopSpinner(id, success = true, finalMessage = '') {
        if (!this.spinners.has(id)) {
            return;
        }

        const spinner = this.spinners.get(id);
        this.spinners.delete(id);

        process.stdout.write('\r' + ' '.repeat(80) + '\r');

        if (success) {
            const icon = this.color('✓', 'green');
            const text = finalMessage || spinner.message;
            const coloredText = this.color(text, 'green');
            console.log(`${icon} ${coloredText}`);
        } else {
            const icon = this.color('✗', 'red');
            const text = finalMessage || spinner.message;
            const coloredText = this.color(text, 'red');
            console.log(`${icon} ${coloredText}`);
        }

        if (this.spinners.size === 0 && this.spinnerInterval) {
            clearInterval(this.spinnerInterval);
            this.spinnerInterval = null;
        }
    }

    updateSpinners() {
        if (this.spinners.size === 0) {
            return;
        }

        for (const [id, spinner] of this.spinners.entries()) {
            spinner.frame = (spinner.frame + 1) % this.spinnerFrames.length;
            const frame = this.color(this.spinnerFrames[spinner.frame], 'cyan');
            const message = this.color(spinner.message, 'cyan');
            process.stdout.write(`\r${frame} ${message}`);
        }
    }

    table(headers, rows) {
        const colWidths = headers.map((header, i) => {
            const headerLen = header.length;
            const maxRowLen = Math.max(...rows.map(row => String(row[i] || '').length));
            return Math.max(headerLen, maxRowLen);
        });

        const topBorder = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
        const bottomBorder = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
        const middleBorder = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';

        console.log(this.color(topBorder, 'dim'));

        const headerRow = '│' + headers.map((header, i) => {
            return ' ' + this.color(header.padEnd(colWidths[i]), 'bright') + ' ';
        }).join('│') + '│';
        console.log(headerRow);
        console.log(this.color(middleBorder, 'dim'));

        rows.forEach(row => {
            const rowStr = '│' + row.map((cell, i) => {
                const cellStr = String(cell || '').padEnd(colWidths[i]);
                return ' ' + cellStr + ' ';
            }).join('│') + '│';
            console.log(rowStr);
        });

        console.log(this.color(bottomBorder, 'dim'));
    }

    tree(items, prefix = '', isLast = true) {
        items.forEach((item, index) => {
            const isLastItem = index === items.length - 1;
            const connector = isLastItem ? '└──' : '├──';
            const currentPrefix = prefix + (isLast ? '   ' : '│  ');

            const icon = item.icon || '📦';
            const name = this.color(item.name, item.color || 'white');
            const details = item.details ? this.color(` (${item.details})`, 'dim') : '';
            const status = item.status ? ` ${item.status}` : '';

            console.log(`${prefix}${connector} ${icon} ${name}${details}${status}`);

            if (item.children && item.children.length > 0) {
                this.tree(item.children, currentPrefix, isLastItem);
            }
        });
    }

    summary(data) {
        const totalTime = ((performance.now() - this.startTime) / 1000).toFixed(2);

        console.log('');
        const border = '═'.repeat(50);
        const topBorder = this.color('╔' + border + '╗', 'green');
        const bottomBorder = this.color('╚' + border + '╝', 'green');
        const sideBorder = this.color('║', 'green');

        console.log(topBorder);

        const title = 'ПЛАТФОРМА УСПЕШНО ЗАПУЩЕНА'.padEnd(48);
        console.log(`${sideBorder} ${this.color(title, 'bright')} ${sideBorder}`);

        const middleBorder = this.color('╠' + border + '╣', 'green');
        console.log(middleBorder);

        data.forEach((item, index) => {
            const isLast = index === data.length - 1;
            const label = item.label.padEnd(30);
            const value = String(item.value).padStart(18);
            const coloredLabel = this.color(label, 'white');
            const coloredValue = this.color(value, item.color || 'green');
            console.log(`${sideBorder} ${coloredLabel} ${coloredValue} ${sideBorder}`);
        });

        const timeLabel = 'Время запуска'.padEnd(30);
        const timeValue = `${totalTime}s`.padStart(18);
        console.log(middleBorder);
        console.log(`${sideBorder} ${this.color(timeLabel, 'white')} ${this.color(timeValue, 'cyan')} ${sideBorder}`);

        console.log(bottomBorder);
        console.log('');
    }

    header(title, subtitle = '') {
        const width = 50;
        const topBorder = this.color('╔' + '═'.repeat(width) + '╗', 'cyan');
        const bottomBorder = this.color('╚' + '═'.repeat(width) + '╝', 'cyan');
        const sideBorder = this.color('║', 'cyan');

        console.log('');
        console.log(topBorder);

        const titleLine = title.padStart((width + title.length) / 2).padEnd(width);
        console.log(`${sideBorder}${this.color(titleLine, 'bright')}${sideBorder}`);

        if (subtitle) {
            const subtitleLine = subtitle.padStart((width + subtitle.length) / 2).padEnd(width);
            console.log(`${sideBorder}${this.color(subtitleLine, 'dim')}${sideBorder}`);
        }

        console.log(bottomBorder);
        console.log('');
    }
}

export const logger = new Logger();
