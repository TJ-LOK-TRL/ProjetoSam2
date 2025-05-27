<template>
    <div class="toggle-card-container">
        <div class="toggle-card">
            <!-- Key movida para o template -->
            <template v-for="(item, index) in internalItems" :key="index">
                <button class="toggle-card-button" @click="handleClick(item.value)">
                    <div class="toggle-card-button-inner" :class="{ active: isActive(item.value) }">
                        <component :is="item.content" />
                    </div>
                </button>
            </template>
        </div>

        <div ref="slotContainer" style="display: none;">
            <slot />
        </div>
    </div>
</template>

<script setup>
    import { computed, ref, onMounted, h } from 'vue'

    const props = defineProps({
        modelValue: [String, Array, Boolean],
        multiple: Boolean
    })
    const emit = defineEmits(['update:modelValue'])

    const slotContainer = ref(null)
    const internalItems = ref([])

    function isActive(value) {
        return props.multiple
            ? props.modelValue?.includes(value)
            : props.modelValue === value
    }

    function handleClick(value) {
        if (props.multiple) {
            const current = [...(props.modelValue || [])]
            const i = current.indexOf(value)
            if (i === -1) current.push(value)
            else current.splice(i, 1)
            emit('update:modelValue', current)
        } else {
            emit('update:modelValue', value)
        }
    }

    onMounted(() => {
        const nodes = slotContainer.value?.children || []
        internalItems.value = Array.from(nodes).map((node) => {
            const rawValue = node.dataset.value
            const icon = node.innerHTML
            let value = rawValue

            if (rawValue === 'true') value = true
            else if (rawValue === 'false') value = false
            else if (!isNaN(rawValue)) value = Number(rawValue)

            return {
                value,
                content: () => h('div', { innerHTML: icon })
            }
        })
    })
</script>

<style scoped>
    .toggle-card-container {
        width: 100%;
        height: 100%;
    }

    .toggle-card {
        display: flex;
        justify-content: space-around;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 8px;
        width: 100%;
        height: 100%;
    }

    .toggle-card-button {
        all: unset;
        width: 100%;
        padding: 8px;
        border-radius: 0.5rem;
        cursor: pointer;
    }

    .toggle-card-button-inner {
        padding: 5px 10px;
        border-radius: 0.5rem;
    }

    .toggle-card-button-inner.active {
        background-color: rgba(0, 0, 0, 0.1);
    }

    .toggle-card-button-inner:first-child {
        text-align: center;
    }
</style>