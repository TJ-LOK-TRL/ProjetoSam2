<template>
    <div class="toggle-card-container">
        <div class="toggle-card">
            <!-- Key movida para o template -->
            <template v-for="(item, index) in internalItems" :key="index">
                <button :class="{ active: isActive(item.value) }" @click="handleClick(item.value)">
                    <component :is="item.content" />
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
        modelValue: [String, Array],
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
            const value = node.dataset.value
            const icon = node.innerHTML

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
        gap: 8px;
        border: 1px solid #ddd;
        border-radius: 8px;
        width: 100%;
        height: 100%;
        padding: 8px;
    }

    .toggle-card button {
        all: unset;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 0.5rem;
        height: 20px;
    }

    .toggle-card button.active {
        background-color: rgba(0, 0, 0, 0.1);
    }
</style>