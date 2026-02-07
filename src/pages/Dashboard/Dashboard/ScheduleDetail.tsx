
interface ScheduleDetailProps {
  type: 'refueling' | 'dailycheck' | 'service' | 'filterchange';
}

const ScheduleDetail = ({ type }: ScheduleDetailProps) => {
  return (
    <div className="schedule__detail h-full">
      <h1 className="text-lg font-bold pt-4 capitalize">
        {type.replace(/([A-Z])/g, ' $1').trim()} Schedule
      </h1>
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-500">
          Detail view for {type} schedule will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default ScheduleDetail;
