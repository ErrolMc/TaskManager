namespace TaskManager.Backend.Contracts.Notifications
{
    public class ColumnCreatedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.ColumnCreated;

        public string BoardID { get; set; } = string.Empty;
        public string ColumnID { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
    }
}
