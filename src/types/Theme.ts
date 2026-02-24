export interface ThemeCore {
    id: string;
    name: string;
    baseTheme: 'light' | 'dark' | 'both';
    isSystem: boolean;
}

export interface ThemePreset {
    // New structure: core metadata (optional for backward compatibility)
    core?: ThemeCore;
    // Legacy structure: root-level properties
    id?: string;
    name?: string;
    baseTheme?: 'light' | 'dark' | 'both';
    isDark?: boolean;
    isSystem?: boolean;
    isCustom?: boolean;
    background: {
        mode: 'solid' | 'gradient' | 'image';
        color?: string;
        colorDark?: string;
        gradient?: {
            stops: string[];
            from: string;
            to: string;
            reverse: boolean;
        };
        image?: string;
        useSystem: boolean;
    };
    header: {
        color: string;
        colorDark?: string;
        opacity: number;
        textColor: string;
        textColorDark?: string;
        iconColor: string;
        iconColorDark?: string;
        iconSize: string;
        detached?: boolean;
        backdropBlur: string;
    };
    sidebar: {
        color: string;
        colorDark?: string;
        opacity: number;
        textColor: string;
        textColorDark?: string;
        textSize: string;
        iconColor: string;
        iconColorDark?: string;
        iconSize: string;
        detached: boolean;
        backdropBlur: string;
    };
    container: {
        color: string;
        colorDark?: string;
        opacity: number;
        textColor: string;
        textColorDark?: string;
        iconColor: string;
        iconColorDark?: string;
        backdropBlur: string;
        borderColor: string;
        borderColorDark?: string;
    };
    card: {
        opacity: number;
        backdropBlur: string;
        shadow: string;
        shadowDark?: string;
        border: string;
        borderRadius: string;
        borderWidth: string;
        borderOpacity: number;
        borderColor: string;
        borderColorDark?: string;
        textColor: string;
        textColorDark?: string;
        textSize: string;
        iconColor: string;
        iconColorDark?: string;
        iconSize: string;
    };
    button: {
        primary: ButtonStyle;
        secondary: ButtonStyle;
        tertiary: ButtonStyle;
    };
    input: {
        color: string;
        colorDark?: string;
        opacity: number;
        textColor: string;
        textColorDark?: string;
        textSize: string;
        iconColor: string;
        iconSize: string;
        backdropBlur: string;
        shadow: string;
        shadowDark?: string;
        border: string;
        borderRadius: string;
        borderWidth: string;
        borderOpacity: number;
        borderColor: string;
        borderColorDark?: string;
    };
    grid: {
        backgroundColor: string;
        backgroundColorDark?: string;
        borderColor?: string;
        borderColorDark?: string;
        headerColor?: string;
        headerColorDark?: string;
        primaryTextColor?: string;
        primaryTextColorDark?: string;
        headerTextColor?: string;
        headerTextColorDark?: string;
        secondaryTextColor?: string;
        secondaryTextColorDark?: string;
        headerHeight?: string;
        headerHoverColor?: string;
        headerHoverColorDark?: string;
        headerMovingColor?: string;
        headerMovingColorDark?: string;
        showWrapperBorder?: boolean;
        showWrapperBorderDark?: boolean;
        showHeaderRowBorder?: boolean;
        showHeaderRowBorderDark?: boolean;
        rowBorderStyle?: string;
        rowBorderStyleDark?: string;
        rowBorderWidth?: string;
        rowBorderWidthDark?: string;
        rowBorderColor?: string;
        rowBorderColorDark?: string;
        columnBorderStyle?: string;
        columnBorderStyleDark?: string;
        columnBorderWidth?: string;
        columnBorderWidthDark?: string;
        columnBorderColor?: string;
        columnBorderColorDark?: string;
    };
    ui: {
        primaryColor: string;
        primaryColorDark?: string;
        borderGlowColor?: string;
        borderGlowSize?: string;
    };
    popup: {
        backgroundColor: string;
        backgroundColorDark?: string;
        opacity: number;
        borderRadius: string;
        backdropBlur: string;
        blurDepth?: string;
        backdropGrayscale?: boolean;
        borderColor: string;
        borderColorDark?: string;
        textColor: string;
        textColorDark?: string;
        textActiveColor: string;
        textActiveColorDark?: string;
        textHoverColor: string;
        textHoverColorDark?: string;
        iconColor: string;
        iconColorDark?: string;
        separatorColor: string;
        separatorColorDark?: string;
        headerIconColor: string;
        headerIconColorDark?: string;
        headerTextColor: string;
        headerTextColorDark?: string;
    };
}

export interface ButtonStyle {
    color: string;
    colorDark?: string;
    opacity: number;
    textColor: string;
    textColorDark?: string;
    textSize: string;
    iconColor: string;
    iconColorDark?: string;
    iconSize: string;
    backdropBlur: string;
    shadow: string;
    shadowDark?: string;
    border: string;
    borderRadius: string;
    borderWidth: string;
    borderOpacity: number;
    borderColor: string;
    borderColorDark?: string;
}

export interface NewThemeOptions {
    background: {
        type: 'color' | 'gradient';
        value: string;
    };
    fontScale: number;
    primaryColor: string;
    panelTransparency: number;
    cardTransparency: number;
}
