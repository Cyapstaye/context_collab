import { useRealtimeStore } from '../../store/realtimeStore';
import { userIdentity } from '../../lib/socket';

export default function PresenceBar() {
  const presenceUsers = useRealtimeStore((s) => s.presenceUsers);

  // Include self in the display
  const self = {
    userId: userIdentity.userId,
    email: userIdentity.email,
    color: userIdentity.color,
  };

  const allUsers = [self, ...presenceUsers.filter((u) => u.userId !== self.userId)];

  return (
    <div className="flex items-center gap-1.5">
      {allUsers.map((user) => (
        <div
          key={user.userId}
          title={user.email}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white select-none flex-shrink-0"
          style={{ backgroundColor: user.color }}
        >
          {user.email.slice(0, 1).toUpperCase()}
        </div>
      ))}
      {allUsers.length > 1 && (
        <span className="text-[10px] text-gray-400">{allUsers.length} online</span>
      )}
    </div>
  );
}
