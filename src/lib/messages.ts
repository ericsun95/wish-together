export const messages = {
  "zh-CN": {
    brand: "两个人的心愿单",
    wishes: "想做的事",
    done: "已经完成",
    add: "添加心愿",
    language: "语言",
    emptyTitle: "从一个心动的链接开始",
    emptyBody: "把想去的地方、想吃的店或想一起做的事存下来。",
    pasteLink: "粘贴小红书或其他链接",
    title: "标题",
    note: "备注",
    save: "保存心愿",
    cancel: "取消",
    urlError: "请输入有效的 http 或 https 链接",
    titleError: "给这个心愿起个名字",
    openLink: "打开链接",
    markDone: "完成打卡",
    undo: "移回想做",
    delete: "删除",
    completedEmpty: "完成的心愿会出现在这里",
    saved: "已保存",
    localOnly: "当前保存在此设备上",
  },
  en: {
    brand: "Wish Together",
    wishes: "Wishlist",
    done: "Completed",
    add: "Add wish",
    language: "Language",
    emptyTitle: "Start with a link you love",
    emptyBody: "Save places to go, food to try, and things to do together.",
    pasteLink: "Paste a Xiaohongshu or other link",
    title: "Title",
    note: "Note",
    save: "Save wish",
    cancel: "Cancel",
    urlError: "Enter a valid http or https link",
    titleError: "Give this wish a name",
    openLink: "Open link",
    markDone: "Mark done",
    undo: "Move to wishlist",
    delete: "Delete",
    completedEmpty: "Completed wishes will appear here",
    saved: "Saved",
    localOnly: "Currently saved on this device",
  },
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof messages["en"];

type AssertNever<T extends never> = T;
type MissingChineseKeys = AssertNever<Exclude<keyof typeof messages["en"], keyof typeof messages["zh-CN"]>>;
type MissingEnglishKeys = AssertNever<Exclude<keyof typeof messages["zh-CN"], keyof typeof messages["en"]>>;
