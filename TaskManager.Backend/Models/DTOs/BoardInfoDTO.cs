namespace TaskManager.Backend.Models.DTOs
{
    public class BoardInfoDTO
    {
        public string BoardID { get; set; } = string.Empty;
        public string BoardName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAtUTC { get; set; }
        public DateTime UpdatedAtUTC { get; set; }
    }
}
