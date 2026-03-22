namespace TaskManager.Backend.Models
{
    public class CardMessage
    {
        public string MessageID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string SenderUserID { get; set; } = string.Empty;
        public DateTime CreateTimeUTC { get; set; }
    }
}

