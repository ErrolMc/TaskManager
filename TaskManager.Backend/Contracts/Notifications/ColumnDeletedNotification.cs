using TaskManager.Backend.Contracts.Shared;

namespace TaskManager.Backend.Contracts.Notifications
{
    public class ColumnDeletedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.ColumnDeleted;

        public string BoardID { get; set; } = string.Empty;
        public string DeletedColumnID { get; set; } = string.Empty;
        public List<ItemPosition> ColumnsPositions { get; set; } = new List<ItemPosition>();
    }
}
