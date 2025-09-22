import React, { ReactNode } from "react";
import { useAuth } from "../../pages/Authentication/AuthContext";

// Props: kita terima children dan allowedRoles yang bisa string atau array string
interface ExclusiveWidgetProps {
  allowedRoles: string | string[]; // Bisa single string atau array
  children: ReactNode;
}


const ExclusiveWidget: React.FC<ExclusiveWidgetProps> = ({ allowedRoles, children }) => {

    const { currentUser } = useAuth();
    const role = currentUser?.role || "";
  // Fungsi untuk mengecek apakah role diizinkan
  const isRoleAllowed = (): boolean => {
    // Jika allowedRoles adalah string
    if (typeof allowedRoles === "string") {
      return role === allowedRoles;
    }
    
    // Jika allowedRoles adalah array
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(role);
    }
    
    return false;
  };

  // Jika role tidak diizinkan, tidak render children sama sekali
  if (!isRoleAllowed()) {
    return null;
  }

  // Jika role diizinkan, render children
  return <>{children}</>;
};

export default ExclusiveWidget;