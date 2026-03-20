namespace TaskManager.Backend.Contracts.Notifications
{
    public class ColumnEditedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.ColumnEdited;

        public string BoardId { get; set; }
        public string ColumnId { get; set; }
        public string Title { get; set; }
    }
}
