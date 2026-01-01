<template>
    <div class="items-thrower-page">
        <ItemsThrowerOverlay />
    </div>
</template>

<script setup lang="ts">
import ItemsThrowerOverlay from '@features/items-thrower/ui/ItemsThrowerOverlay.vue';
</script>

<style scoped>
.items-thrower-page {
    position: fixed;
    inset: 0;
}
</style>
