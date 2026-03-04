using TaskManager.Backend.Models.DTOs;

namespace TaskManager.Backend.Models
{
    public class User
    {
        public string UserID { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;

        public UserDTO AsUserDTO() => new UserDTO
        {
            UserID = this.UserID,
            Username = this.Username
        };
    }
}
