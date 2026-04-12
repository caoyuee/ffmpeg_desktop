declare namespace BaseFormType {
    interface OptionValue {
        value: string | number,
        label: string,
        [key: string]: any; // 允许其他属性
        children?: OptionValue[]
    }
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
    interface Toast {
        success: (text: string, duration?: number) => void;
        error: (text: string, duration?: number) => void;
        info: (text: string, duration?: number) => void;
        hide: () => void;
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
}