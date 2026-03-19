using TaskManager.Backend.Contracts.Shared;

namespace TaskManager.Backend.Contracts.Notifications
{
    public class ColumnMovedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.ColumnMoved;

        public string BoardID { get; set; } = string.Empty;
        public List<ItemPosition> ColumnsPositions { get; set; } = new List<ItemPosition>();
    }
}
