import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import MeetingScheduler from '@/components/parent/MeetingScheduler';

const Meetings = () => {
  const { profile } = useAuth();
  
  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return <MeetingScheduler />;
};

export default Meetings;