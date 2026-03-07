namespace TaskManager.Backend.Models
{
    public class Board
    {
        public string ID { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string OwnerUserID { get; set; } = string.Empty;
        public DateTime CreatedAtUTC { get; set; }
        public DateTime UpdatedAtUTC { get; set; }

        // nav properties
        public User Owner { get; set; } = null!;
    }
}
