using TaskManager.Backend.Contracts.Shared;

namespace TaskManager.Backend.Contracts.Notifications
{
    public class CardDeletedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.CardDeleted;

        public string BoardID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
        public ColumnArrangement ColumnArrangement { get; set; } = null!;
    }
}
