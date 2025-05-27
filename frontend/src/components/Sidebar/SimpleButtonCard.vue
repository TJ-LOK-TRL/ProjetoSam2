<template>
    <div class="simple-button-container">
        <button class="simple-button" @click="$emit('on-click')">
            <i class="simple-button-icon" :class="icon"></i>
            <label class="simple-button-label">{{ label }}</label>
        </button>
    </div>

</template>

<script setup>
    defineProps({
        label: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: true
        }
    })
</script>

<style scoped>
    .simple-button-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
    }

    .simple-button {
        all: unset;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 4rem;
        height: 3rem;
        color: rgb(81, 76, 77);
        border: 1px solid rgb(231, 230, 230);
        box-shadow: rgba(0, 0, 0, 0.06) 0px 1px 1px;
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 400;
        border-radius: 10px;
        cursor: pointer;
        user-select: none;
    }

    .simple-button-label {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
        color: rgb(39, 37, 37);
    }

    .simple-button-icon {
        font-size: 18px;
        color: rgb(81, 76, 77);
    }
</style>