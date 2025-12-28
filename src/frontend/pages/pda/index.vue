<template>
    <PDAWidget>
        <template #screen-content>
            <OSInterfaceWidget />
        </template>
    </PDAWidget>
</template>

<script setup>
import { PDAWidget } from '../../widgets/pda';
import { OSInterfaceWidget } from '../../widgets/os-interface';
</script>

