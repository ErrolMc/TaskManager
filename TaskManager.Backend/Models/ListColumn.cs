using System.Diagnostics.Contracts;

namespace TaskManager.Backend.Models
{
    public class ListColumn
    {
        public string ColumnID { get; set; } = string.Empty;
        public string BoardID { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Position { get; set; }
        public DateTime CreatedAtUTC { get; set; }
        public DateTime UpdatedAtUTC { get; set; }
    }
}
