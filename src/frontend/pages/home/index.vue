<template>
    <div class="home-page">
        <h1>Stalker PDA Overlay</h1>
        <nav>
            <router-link to="/pda">PDA</router-link>
            <router-link to="/exp-logger">EXP Logger</router-link>
        </nav>
    </div>
</template>

<script setup>
</script>

<style scoped>
.home-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: #1a1a1a;
}

h1 {
    margin-bottom: 2rem;
    color: #fff;
    font-family: monospace;
}

nav {
    display: flex;
    gap: 1rem;
}

a {
    padding: 0.5rem 1rem;
    background: #333;
    color: #fff;
    text-decoration: none;
    border-radius: 4px;
    transition: background 0.2s;
}

a:hover,
a.router-link-active {
    background: #555;
}
</style>

