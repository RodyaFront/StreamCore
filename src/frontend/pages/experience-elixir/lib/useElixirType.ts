import type { ElixirType } from '../types';

export function useElixirType() {
    function getType(rewardTitle: string): ElixirType {
        const lowerTitle = rewardTitle.toLowerCase();

        if (lowerTitle.includes('малый') || lowerTitle.includes('маленький')) {
            return 'small';
        }
        if (lowerTitle.includes('средний')) {
            return 'medium';
        }
        if (lowerTitle.includes('великий') || lowerTitle.includes('большой')) {
            return 'large';
        }

        return 'small';
    }

    return {
        getType
    };
}
