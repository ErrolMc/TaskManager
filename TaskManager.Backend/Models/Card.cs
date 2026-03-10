namespace TaskManager.Backend.Models
{
    public class Card
    {
        public string CardID { get; set; } = string.Empty;
        public string ColumnID { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Position { get; set; }
        public DateTime DueAtUTC { get; set; }
        public string CreatedByUserID { get; set; } = string.Empty;
        public bool IsArchived { get; set; }
    }
}
