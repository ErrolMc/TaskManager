namespace TaskManager.Backend.Models
{
    public enum RefreshTokenValidateState
    {
        Success = 0,
        CantFindToken,
        TokenExpired,
    }

    public class RefreshToken
    {
        public string ID { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public DateTime Expiry { get; set; }
        public string UserID { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
    }
}
