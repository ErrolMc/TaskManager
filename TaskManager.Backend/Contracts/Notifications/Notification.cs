namespace TaskManager.Backend.Contracts.Notifications
{
    public class Notification
    {
        public virtual NotificationType NotificationType => NotificationType.None;
        public string SenderUserID { get; set; } = string.Empty;
    }
}
