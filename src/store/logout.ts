// import { useDispatch } from "react-redux";
// import { supabase } from "../db/SupabaseClient";
// import { clearSession } from "./authSlice";



// const handleLogout = async () => {

//   const dispatch = useDispatch();
  
//   await supabase.auth.signOut(); // Sign out from Supabase
//   dispatch(clearSession()); // Clear session from Redux
//   console.log('Logged out');
// };

// export { handleLogout }