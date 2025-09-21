import React, { ReactNode } from "react";

// Props: kita terima children dan currentUser.role
interface TrialProps {
  role: string;
  children: ReactNode;
}

const Trial: React.FC<TrialProps> = ({ role, children }) => {
  // Jika bukan CREATOR, tidak render children sama sekali
  if (role !== "CREATOR") {
    return null;
  }

  // Jika CREATOR render children
  return <>{children}</>;
};

export default Trial;
