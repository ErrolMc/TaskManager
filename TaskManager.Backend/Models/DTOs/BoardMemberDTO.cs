using TaskManager.Backend.Models.Enums;

namespace TaskManager.Backend.Models.DTOs
{
    public class BoardMemberDTO
    {
        public UserDTO User { get; set; } = null!;
        public Role Role { get; set; }
    }
}
