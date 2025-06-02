<template>
    <div class="custom-select">
        <div class="input-wrapper">
            <input class="input" type="text" v-model="search" @focus="handleFocus" @blur="handleBlur"
                @keydown.enter="handleBlur" :placeholder='placeholder' ref="inputRef" />
            <i class="fa fa-chevron-down input-icon" aria-hidden="true"></i>
        </div>
        <ul v-if="open" class="dropdown">
            <li v-for="item in filteredItems" :key="item.label" @mousedown.prevent="select(item)"
                :style="item.font ? { fontFamily: item.font } : {}">
                {{ item.label }}
            </li>
            <li v-if="filteredItems.length === 0" class="no-results">No results</li>
        </ul>
    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue'

    const props = defineProps({
        placeholder: String,
        items: Array,
        modelValue: Object,
        allowFreeValue: {
            type: Boolean,
            default: false
        }
    })

    const emit = defineEmits(['update:modelValue'])

    const placeholder = ref(props.placeholder)
    const items = ref(props.items)
    const open = ref(false)
    const search = ref('')
    const selected = ref(props.modelValue)
    const inputRef = ref(null)

    const filteredItems = computed(() => {
        return (items.value || []).filter(i =>
            i.label.toLowerCase().includes(search.value.toLowerCase())
        )
    })

    function select(item) {
        selected.value = item
        emit('update:modelValue', item)
        search.value = ''
        placeholder.value = item.label
        open.value = false
        inputRef.value?.blur()
    }

    function handleFocus() {
        open.value = true
    }

    function handleBlur() {
        open.value = false

        if (props.allowFreeValue && search.value.trim()) {
            const newItem = { free: search.value.trim()  }
            selected.value = newItem
            emit('update:modelValue', newItem)
            placeholder.value = newItem.free
            search.value = ''
        }
    }
</script>

<style scoped>
    .custom-select {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .input-wrapper {
        position: relative;
        display: inline-block;
        width: 100%;
        height: 100%;
    }

    .input-icon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: #515151;
        font-size: 0.6rem;
    }

    .input {
        width: 100%;
        height: 100%;
        padding: 8px;
        font-size: 14px;
        border-radius: 8px;
        border: 1px solid #ddd;
        box-sizing: border-box;
        cursor: pointer;
    }

    .input:focus {
        outline: none;
        /*border-color: var(--main-color);*/
        cursor: text;
    }

    .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #fff;
        z-index: 10;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        margin-top: 4px;
        padding: 0;
    }

    .dropdown li {
        padding: 8px 12px;
        cursor: pointer;
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        color: var(--color-gray-950);
        margin-right: 4px;
        font-weight: 500;
    }

    .dropdown li:hover {
        background: #e6f0ff;
    }

    .no-results {
        padding: 8px 12px;
        color: #888;
    }

    .selected {
        margin-top: 8px;
        font-size: 14px;
    }
</style>