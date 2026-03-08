using TaskManager.Backend.Models.DTOs;
using TaskManager.Backend.Models.Enums;

namespace TaskManager.Backend.Models
{
    public class BoardMember
    {
        public string BoardID { get; set; } = string.Empty;
        public string UserID { get; set; } = string.Empty;
        public Role Role { get; set; } = Role.Viewer;
        public DateTime JoinedAtUTC { get; set; }

        // nav properties
        public User User { get; set; } = null!;
        public Board Board { get; set; } = null!;
    }
}
