
const AchievementTab = () => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-white/20 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-3xl shadow-lg">
            <div className="w-20 h-20 bg-white/30 dark:bg-white/10 rounded-full flex items-center justify-center mb-6 text-slate-500 shadow-inner backdrop-blur-sm animate-pulse-slow">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            </div>
            <h3 className="text-2xl font-bold text-black dark:text-white mb-2 drop-shadow-sm">Achievement</h3>
            <p className="text-base text-slate-600 dark:text-slate-300 font-medium">This feature is clearly under development.</p>
        </div>
    );
};

export default AchievementTab;
