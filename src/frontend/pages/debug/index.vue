<template>
    <div class="min-h-screen bg-gray-900 p-8 text-white">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold mb-8">Debug Tools - Level System</h1>

            <div class="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 class="text-xl font-semibold mb-4">Test Parameters</h2>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Username</label>
                        <input
                            v-model="testParams.username"
                            type="text"
                            class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                            placeholder="test_user"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Amount</label>
                        <input
                            v-model.number="testParams.amount"
                            type="number"
                            class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                            placeholder="5"
                        />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Source</label>
                    <select
                        v-model="testParams.source"
                        class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="message">Message</option>
                        <option value="word_of_day">Word of Day</option>
                        <option value="achievement">Achievement</option>
                        <option value="quest">Quest</option>
                        <option value="streak">Streak</option>
                        <option value="unknown">Unknown</option>
                    </select>
                </div>
            </div>

            <div class="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 class="text-xl font-semibold mb-4">Trigger Events</h2>
                <div class="grid grid-cols-2 gap-4">
                    <button
                        @click="triggerEvent('exp:added')"
                        class="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                    >
                        Add Experience
                    </button>
                    <button
                        @click="triggerEvent('level:up')"
                        class="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                    >
                        Level Up (Force)
                    </button>
                    <button
                        @click="triggerEvent('exp:added:custom')"
                        class="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                    >
                        Custom EXP Event
                    </button>
                    <button
                        @click="triggerEvent('level:up:custom')"
                        class="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
                    >
                        Custom Level Up
                    </button>
                </div>
            </div>

            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
                <div class="grid grid-cols-3 gap-4">
                    <button
                        @click="quickAction('message')"
                        class="px-4 py-2 bg-blue-500/30 hover:bg-blue-500/50 rounded-lg border border-blue-400/30 transition-colors"
                    >
                        Message (+5)
                    </button>
                    <button
                        @click="quickAction('word_of_day')"
                        class="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg border border-purple-400/30 transition-colors"
                    >
                        Word of Day (+10)
                    </button>
                    <button
                        @click="quickAction('achievement')"
                        class="px-4 py-2 bg-yellow-500/30 hover:bg-yellow-500/50 rounded-lg border border-yellow-400/30 transition-colors"
                    >
                        Achievement (+20)
                    </button>
                    <button
                        @click="quickAction('quest')"
                        class="px-4 py-2 bg-green-500/30 hover:bg-green-500/50 rounded-lg border border-green-400/30 transition-colors"
                    >
                        Quest (+15)
                    </button>
                    <button
                        @click="quickAction('streak')"
                        class="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg border border-red-400/30 transition-colors"
                    >
                        Streak (+25)
                    </button>
                    <button
                        @click="triggerLevelUp()"
                        class="px-4 py-2 bg-orange-500/30 hover:bg-orange-500/50 rounded-lg border border-orange-400/30 transition-colors"
                    >
                        Level Up (+1000)
                    </button>
                </div>
            </div>

            <div v-if="lastResponse" class="mt-6 bg-gray-800 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2">Last Response</h3>
                <pre class="bg-gray-900 p-4 rounded overflow-auto text-sm">{{ JSON.stringify(lastResponse, null, 2) }}</pre>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const testParams = ref({
    username: 'test_user',
    amount: 5,
    source: 'message'
});

const lastResponse = ref(null);

const API_URL = 'http://localhost:3001';

const triggerEvent = async (eventType) => {
    try {
        const response = await fetch(`${API_URL}/api/debug/trigger-event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventType,
                username: testParams.value.username,
                amount: testParams.value.amount,
                source: testParams.value.source
            })
        });

        const data = await response.json();
        lastResponse.value = data;
    } catch (error) {
        lastResponse.value = { error: error.message };
    }
};

const quickAction = async (source) => {
    const amounts = {
        message: 5,
        word_of_day: 10,
        achievement: 20,
        quest: 15,
        streak: 25
    };

    testParams.value.source = source;
    testParams.value.amount = amounts[source] || 5;

    await triggerEvent('exp:added');
};

const triggerLevelUp = async () => {
    testParams.value.amount = 1000;
    await triggerEvent('level:up');
};
</script>

