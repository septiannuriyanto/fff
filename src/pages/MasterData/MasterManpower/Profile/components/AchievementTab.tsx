
const AchievementTab = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-300 dark:border-strokedark rounded-lg">
            <div className="w-16 h-16 bg-slate-100 dark:bg-meta-4 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white mb-2">Achievement</h3>
            <p className="text-sm text-slate-500">This feature is currently under development.</p>
        </div>
    );
};

export default AchievementTab;
