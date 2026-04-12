<template>
    <form class="form" id="baseForm">
        <template v-for="(item, index) in props.formOptions" :key="index+item.type">
            <template v-if="visibleItems[item.name]">
                <template v-if="item.type === 'input'">
                    <div class="form-item" :class="{ 'has-error': fieldErrors[item.model as string] }">
                        <label class="form-item-label" :for="item.name">{{ item.label }}</label>
                        <div class="form-item-content">
                            <input :style="{ width: `calc(${item.width} - 15px)` }" :disabled="item.disabled"
                                type="input" :name="item.name" id="item.name" form="baseForm"
                                v-model.trim="formModel[item.model as string]"
                                :placeholder="item.placeholder || '请输入'" />
                            <div v-if="fieldErrors[item.model as string]" class="error-message">
                                {{ fieldErrors[item.model as string][0] }}
                            </div>
                        </div>
                    </div>
                </template>
                <template v-if="item.type === 'textarea'">
                    <div class="form-item align-top" :class="{ 'has-error': fieldErrors[item.model as string] }">
                        <label class="form-item-label" :for="item.name">{{ item.label }}</label>
                        <div class="form-item-content">
                            <textarea :style="{ width: `calc(${item.width} - 15px)`, resize: 'none' }"
                                :disabled="item.disabled" :name="item.name" id="item.name" form="baseForm"
                                :rows="item.rows || 2" v-model="formModel[item.model as string] as string"
                                :placeholder="item.placeholder || '请输入'"></textarea>
                            <div v-if="fieldErrors[item.model as string]" class="error-message">
                                {{ fieldErrors[item.model as string][0] }}
                            </div>
                        </div>
                    </div>
                </template>
                <template v-if="item.type === 'switch'">
                    <div class="form-item">
                        <label class="form-item-label" :for="item.name">{{ item.label }}</label>
                        <common-switch :width="item.width" :disabled="item.disabled" :name="item.name" form="baseForm"
                            v-model="formModel[item.model as string]" />
                    </div>
                </template>
                <template v-if="item.type === 'select'">
                    <div class="form-item" :class="{ 'has-error': fieldErrors[item.model as string] }">
                        <label class="form-item-label" :for="item.name">{{ item.label }}</label>
                        <div class="form-item-content">
                            <select form="baseForm" :style="{ width: `calc(${item.width} - 15px)` }"
                                :disabled="item.disabled" :multiple="item.multiple" :name="item.name" :id="item.name"
                                v-model="formModel[item.model as string]">
                                <option value="">请选择</option>
                                <template v-for="(ele, _ind) in dynamicOptions[item.name] || item.options"
                                    :key="typeof ele === 'object'?ele.value:ele">
                                    <template v-if="typeof ele === 'object'">
                                        <option :value="ele.value"
                                            :selected="formModel[item.model as string] === ele.value">
                                            {{ ele.label }}</option>
                                    </template>
                                    <template v-else>
                                        <option :value="ele" :selected="formModel[item.model as string] === ele">{{
                                            ele }}</option>
                                    </template>
                                </template>
                            </select>
                            <div v-if="fieldErrors[item.model as string]" class="error-message">
                                {{ fieldErrors[item.model as string][0] }}
                            </div>
                        </div>
                    </div>
                </template>
                <template v-if="item.type === 'cascader'">
                    <div class="form-item" :class="{ 'has-error': fieldErrors[item.model as string] }">
                        <label class="form-item-label" :for="item.name">{{ item.label }}</label>
                        <div class="form-item-content">
                            <CommonCascader :width="item.width" :options="item.options" :config="item.props"
                                v-model="formModel[item.model as string]" @update:value="(value) => {
                                    console.log(value, formModel[item.model as string], 'list=====');
                                    formModel[item.model as string] = [...value]
                                }" />
                            <div v-if="fieldErrors[item.model as string]" class="error-message">
                                {{ fieldErrors[item.model as string][0] }}
                            </div>
                        </div>
                    </div>
                </template>
                <template v-if="item.type === 'custom'">
                    <template v-for="(slot, _soltI) in item.slotList" :key="slot.slotName+_soltI">
                        <template v-if="$slots[slot.slotName]">
                            <div class="form-item">
                                <label class="form-item-label">{{ slot.label || '' }}</label>
                                <div class="form-item-content">
                                    <slot name="extra" :form="slot.readyOnly ? { ...formModel } : formModel"></slot>
                                </div>
                            </div>
                        </template>
                    </template>
                </template>
                <template v-if="item.type === 'buttons'">
                    <div class="form-item">
                        <label class="form-item-label" :for="item.name">{{ item.label || '' }}</label>
                        <div class="form-item-content">
                            <template v-for="(ele, _ind) in item.btnList" :key="_ind + ele.name">
                                <label>
                                    <button class="submitBtn" form="baseForm" type="button" :name="ele.name"
                                        :disabled="item.disabled" @click.stop.self="handleSubmit(ele.name)">{{
                                            ele.label }}</button>
                                </label>
                            </template>
                        </div>
                    </div>
                </template>
            </template>
        </template>
    </form>
</template>
<script lang="ts" setup name="CommonForm">
import { ref, reactive, onBeforeMount, computed } from 'vue';
import CommonCascader from "@/baseComponents/CommonCascader.vue"
import CommonSwitch from '@/baseComponents/CommonSwitch.vue';
interface FormOption {
    type: string
    name: string
    model?: string
    label?: string
    placeholder?: string
    default?: string | number | boolean
    multiple?: boolean
    disabled?: boolean
    // 联动配置
    connect?: string; // 关联的表单项名
    connectRule?: 'equals' | 'notEquals' | 'includes' | 'greaterThan' | 'lessThan'; // 比较规则
    connectValue?: any; // 比较值
    connectValues?: any[] // 多个比较值（用于多选）
    // 或者使用更灵活的条件函数
    condition?: (formData: Record<string, any>) => boolean

    // 动态选项配置
    dynamicOptions?: {
        source: string; // 数据源表单项
        mapper: (value: any, formData: Record<string, any>) => any[]; // 选项映射函数
    }
    props?: {
        label: string
        value: string
        children: string
    }
    options?: string[] | number[] | OptionValue[]
    btnList?: {
        name: string,
        label: string,
        disabled?: boolean
    }[]
    slotList?: {
        slotName: string,
        label?: string,
        readyOnly?: boolean
    }[]
    rules?: ValidationRule[];
    width?: string,
    rows?: number
}

interface OptionValue {
    value: string | number,
    label: string,
    [key: string]: any; // 允许其他属性
    children?: OptionValue[]
}

interface ValidationRule {
    required?: boolean;
    type?: 'string' | 'number' | 'array' | 'object';
    min?: number;
    max?: number;
    pattern?: RegExp;
    validator?: (value: any, formData: Record<string, unknown>) => boolean | string;
    message?: string;
}

interface Props {
    formOptions: FormOption[]
}
const props = defineProps<Props>()
const emit = defineEmits<{
    submit: [name: string, payload: Record<string, unknown>] // 具名元组语法
}>()
// 响应式表单数据对象
const formModel = reactive<Record<string, unknown>>({});
// 校验字段错误状态存储
const fieldErrors = ref<Record<string, string[]>>({});
/**
 * 组件挂载前初始化表单数据
 * 根据表单配置项的默认值设置初始数据
 */
onBeforeMount(() => {
    props.formOptions.forEach((option) => {
        if (option.model) {
            switch (option.type) {
                case 'input':
                    formModel[option.model] = option.default || ''
                    break;
                case 'textarea':
                    formModel[option.model] = option.default || ''
                    break;
                case 'switch':
                    formModel[option.model] = option.default || false
                    break;
                case 'select':
                    formModel[option.model] = option.default || ''
                    break;
                case 'cascader':
                    formModel[option.model] = option.default || []
                    break;
                default:
                    formModel[option.model] = undefined
                    break;
            }

        }
    })
})
/**
 * 计算可见的表单项
 * 根据条件函数或连接规则判断哪些表单项应该显示
 */
const visibleItems = computed(() => {
    const visibility: Record<string, boolean> = {};
    props.formOptions.forEach(item => {
        if (item.condition) {
            // 使用自定义条件函数
            visibility[item.name] = item.condition(formModel);
        } else if (item.connect) {
            const connectedValue: any = formModel[item.connect];

            // 根据不同的比较规则判断显示条件
            switch (item.connectRule) {
                case 'equals':
                    visibility[item.name] = connectedValue === item.connectValue;
                    break;
                case 'notEquals':
                    visibility[item.name] = connectedValue !== item.connectValue;
                    break;
                case 'includes':
                    visibility[item.name] = Array.isArray(connectedValue) &&
                        connectedValue.includes(item.connectValue);
                    break;
                case 'greaterThan':
                    visibility[item.name] = connectedValue > item.connectValue;
                    break;
                case 'lessThan':
                    visibility[item.name] = connectedValue < item.connectValue;
                    break;
                default:
                    // 默认布尔判断
                    visibility[item.name] = connectedValue !== false && connectedValue !== 'false';
            }
        } else {
            visibility[item.name] = true;
        }
    });

    return visibility;
});

/**
 * 计算动态选项
 * 根据其他字段的值动态生成选项列表
 */
const dynamicOptions = computed(() => {
    const options: Record<string, any[]> = {};

    props.formOptions.forEach(item => {
        if (item.dynamicOptions) {
            const sourceValue = formModel[item.dynamicOptions.source];
            options[item.name] = item.dynamicOptions.mapper(sourceValue, formModel);
        }
    });

    return options;
});
/**
 * 验证单个字段
 * @param fieldName 字段名称（用于错误消息）
 * @param value 字段值
 * @param rules 验证规则数组
 * @returns 错误消息数组
 */
const validateField = (fieldName: string, value: any, rules: BaseFormType.ValidationRule[]): string[] => {
    // 获取国际化文本
    const getLocaleMessage = (type: string, field: string) => {
        // 获取当前语言设置
        const currentLang = localStorage.getItem('language') || 'zh-CN';

        const messages: Record<string, Record<string, string>> = {
            'zh-CN': {
                required: `${field}不能为空`,
                string: `${field}必须是字符串类型`,
                number: `${field}必须是数字类型`,
                array: `${field}必须是数组类型`,
                object: `${field}必须是对象类型`,
                min: `${field}不能小于${value}`,
                max: `${field}不能大于${value}`,
                pattern: `${field}格式不正确`
            },
            'en-US': {
                required: `${field} is required`,
                string: `${field} must be a string`,
                number: `${field} must be a number`,
                array: `${field} must be an array`,
                object: `${field} must be an object`,
                min: `${field} cannot be less than ${value}`,
                max: `${field} cannot be greater than ${value}`,
                pattern: `${field} format is incorrect`
            }
        };

        const langMessages = messages[currentLang] || messages['zh-CN'];
        return langMessages[type] || `${field} validation failed`;
    };
    const errors: string[] = [];

    for (const rule of rules) {
        if (rule.required && (value === null || value === undefined || value === '' ||
            (Array.isArray(value) && value.length === 0))) {
            errors.push(rule.message || getLocaleMessage('required', fieldName));
            continue;
        }

        if (rule.type) {
            const typeMatch: Record<string, boolean> = {
                string: typeof value === 'string',
                number: typeof value === 'number',
                array: Array.isArray(value),
                object: typeof value === 'object' && value !== null && !Array.isArray(value)
            };

            if (rule.type && !typeMatch[rule.type]) {
                errors.push(rule.message || getLocaleMessage(rule.type, fieldName));
                continue;
            }
        }

        if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
            errors.push(rule.message || getLocaleMessage('min', fieldName));
        }

        if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
            errors.push(rule.message || getLocaleMessage('max', fieldName));
        }

        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
            errors.push(rule.message || getLocaleMessage('pattern', fieldName));
        }

        if (rule.validator) {
            const result = rule.validator(value, formModel);
            if (result !== true) {
                errors.push(typeof result === 'string' ? result : rule.message || `${fieldName}验证失败`);
            }
        }
    }

    return errors;
};
/**
 * 验证整个表单
 * @returns 验证结果对象，包含是否有效和错误信息
 */
const validateForm = (): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};
    let isValid = true;
    props.formOptions.forEach(item => {
        if (item.rules && item.rules.length > 0 && visibleItems.value[item.name] && item.model) {
            const value = formModel[item.model as string];
            const fieldErrors = validateField(item.label || item.name, value, item.rules);

            if (fieldErrors.length > 0) {
                errors[item.model] = fieldErrors;
                isValid = false;
            }
        }
    });

    fieldErrors.value = errors;
    return { isValid, errors };
};

/**
 * 清空表单
 */
const resetForm = () => {
    props.formOptions.forEach((option) => {
        if (option.model) {
            switch (option.type) {
                case 'input':
                case 'textarea':
                    formModel[option.model] = option.default || '';
                    break;
                case 'switch':
                    formModel[option.model] = option.default || false;
                    break;
                case 'select':
                    formModel[option.model] = option.default || '';
                    break;
                case 'cascader':
                    formModel[option.model] = option.default || [];
                    break;
                default:
                    formModel[option.model] = option.default || undefined;
                    break;
            }
        }
    });
    fieldErrors.value = {};
};

/**
 * 设置表单字段值
 * @param fieldName 字段名
 * @param value 字段值
 */
const setFieldValue = (fieldName: string, value: any) => {
    const fieldOption = props.formOptions.find(option => option.model === fieldName);
    if (fieldOption) {
        formModel[fieldName] = value;
    }
};

/**
 * 获取表单字段值
 * @param fieldName 字段名
 * @returns 字段值
 */
const getFieldValue = (fieldName: string) => {
    return formModel[fieldName];
};

// 暴露更多方法给父组件
defineExpose({
    validate: validateForm,
    getFormData: () => ({ ...formModel }),
    resetForm,
    setFieldValue,
    getFieldValue
});
/**
 * 处理表单提交
 * @param name 提交按钮的名称
 */
const handleSubmit = (name: string) => {
    console.log(formModel, 'formModel');

    const { isValid, errors } = validateForm();

    if (!isValid) {
        // 显示错误信息
        console.error('表单验证失败:', errors);
        // 可以在这里触发错误提示，比如使用 toast
        return;
    }
    emit('submit', name, { ...formModel })
}
// 暴露验证方法给父组件
defineExpose({
    validate: validateForm,
    getFormData: () => ({ ...formModel })
});
</script>
<style scoped>
.form {
    display: flex;
    flex-flow: column;
    justify-content: flex-start;
    align-items: flex-start;

    .form-item {
        width: calc(100% - 20px);
        display: flex;
        align-items: center;
        box-sizing: border-box;
        margin-bottom: 10px;
        padding: 10px;
        border-radius: 5px;
        background-image: linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%);

        .form-item-label {
            min-width: 15%;
            margin: 0 5px;
            -webkit-user-select: none;
        }

        .form-item-content {
            flex: 1;
            height: calc(100% - 20px);
            box-sizing: border-box;
            overflow: auto;

            .submitBtn {
                margin-right: 10px;
                -webkit-user-select: none;
            }
        }





    }

    .align-top {
        align-items: flex-start;
    }

    .has-error {
        border: 1px solid #f44336;
    }

    .error-message {
        color: #f44336;
        font-size: 12px;
        margin-top: 4px;
    }
}
</style>