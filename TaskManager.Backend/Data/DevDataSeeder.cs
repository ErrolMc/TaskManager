using TaskManager.Backend.Models;
using TaskManager.Backend.Models.Enums;

namespace TaskManager.Backend.Data
{
    public static class DevDataSeeder
    {
        public static void Seed(AppDbContext db)
        {
            if (db.Users.Any())
                return;

            var now = DateTime.UtcNow;
            var passwordHash = BCrypt.Net.BCrypt.HashPassword("pass");

            // --- Users ---
            var alice = new User { UserID = Guid.NewGuid().ToString(), Username = "alice", PasswordHash = passwordHash };
            var bob = new User { UserID = Guid.NewGuid().ToString(), Username = "bob", PasswordHash = passwordHash };
            var charlie = new User { UserID = Guid.NewGuid().ToString(), Username = "charlie", PasswordHash = passwordHash };
            var diana = new User { UserID = Guid.NewGuid().ToString(), Username = "diana", PasswordHash = passwordHash };

            db.Users.AddRange(alice, bob, charlie, diana);

            // --- Boards ---
            var projectAlpha = new Board
            {
                ID = Guid.NewGuid().ToString(),
                Name = "Project Alpha",
                Description = "Main product development board for the Alpha release.",
                OwnerUserID = alice.UserID,
                CreatedAtUTC = now.AddDays(-14),
                UpdatedAtUTC = now.AddDays(-1)
            };
            var marketingCampaign = new Board
            {
                ID = Guid.NewGuid().ToString(),
                Name = "Marketing Campaign",
                Description = "Q2 marketing initiatives and content planning.",
                OwnerUserID = bob.UserID,
                CreatedAtUTC = now.AddDays(-10),
                UpdatedAtUTC = now.AddDays(-2)
            };
            var bugTracker = new Board
            {
                ID = Guid.NewGuid().ToString(),
                Name = "Bug Tracker",
                Description = "Tracking and triaging production issues.",
                OwnerUserID = alice.UserID,
                CreatedAtUTC = now.AddDays(-21),
                UpdatedAtUTC = now
            };

            db.Boards.AddRange(projectAlpha, marketingCampaign, bugTracker);

            // --- Board Members ---
            db.BoardMembers.AddRange(
                new BoardMember { BoardID = projectAlpha.ID, UserID = alice.UserID, Role = Role.Owner, JoinedAtUTC = now.AddDays(-14) },
                new BoardMember { BoardID = projectAlpha.ID, UserID = bob.UserID, Role = Role.Member, JoinedAtUTC = now.AddDays(-13) },
                new BoardMember { BoardID = projectAlpha.ID, UserID = charlie.UserID, Role = Role.Admin, JoinedAtUTC = now.AddDays(-12) },
                new BoardMember { BoardID = projectAlpha.ID, UserID = diana.UserID, Role = Role.Viewer, JoinedAtUTC = now.AddDays(-10) },

                new BoardMember { BoardID = marketingCampaign.ID, UserID = bob.UserID, Role = Role.Owner, JoinedAtUTC = now.AddDays(-10) },
                new BoardMember { BoardID = marketingCampaign.ID, UserID = alice.UserID, Role = Role.Member, JoinedAtUTC = now.AddDays(-9) },
                new BoardMember { BoardID = marketingCampaign.ID, UserID = charlie.UserID, Role = Role.Viewer, JoinedAtUTC = now.AddDays(-8) },

                new BoardMember { BoardID = bugTracker.ID, UserID = alice.UserID, Role = Role.Owner, JoinedAtUTC = now.AddDays(-21) },
                new BoardMember { BoardID = bugTracker.ID, UserID = charlie.UserID, Role = Role.Admin, JoinedAtUTC = now.AddDays(-20) },
                new BoardMember { BoardID = bugTracker.ID, UserID = diana.UserID, Role = Role.Member, JoinedAtUTC = now.AddDays(-18) }
            );

            // --- List Columns ---
            // Project Alpha
            var paTodo = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = projectAlpha.ID, Name = "To Do", Position = 0, CreatedAtUTC = now.AddDays(-14), UpdatedAtUTC = now.AddDays(-14) };
            var paInProgress = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = projectAlpha.ID, Name = "In Progress", Position = 1, CreatedAtUTC = now.AddDays(-14), UpdatedAtUTC = now.AddDays(-14) };
            var paDone = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = projectAlpha.ID, Name = "Done", Position = 2, CreatedAtUTC = now.AddDays(-14), UpdatedAtUTC = now.AddDays(-14) };

            // Marketing Campaign
            var mcBacklog = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = marketingCampaign.ID, Name = "Backlog", Position = 0, CreatedAtUTC = now.AddDays(-10), UpdatedAtUTC = now.AddDays(-10) };
            var mcActive = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = marketingCampaign.ID, Name = "Active", Position = 1, CreatedAtUTC = now.AddDays(-10), UpdatedAtUTC = now.AddDays(-10) };
            var mcCompleted = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = marketingCampaign.ID, Name = "Completed", Position = 2, CreatedAtUTC = now.AddDays(-10), UpdatedAtUTC = now.AddDays(-10) };

            // Bug Tracker
            var btNew = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = bugTracker.ID, Name = "New", Position = 0, CreatedAtUTC = now.AddDays(-21), UpdatedAtUTC = now.AddDays(-21) };
            var btInvestigating = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = bugTracker.ID, Name = "Investigating", Position = 1, CreatedAtUTC = now.AddDays(-21), UpdatedAtUTC = now.AddDays(-21) };
            var btResolved = new ListColumn { ColumnID = Guid.NewGuid().ToString(), BoardID = bugTracker.ID, Name = "Resolved", Position = 2, CreatedAtUTC = now.AddDays(-21), UpdatedAtUTC = now.AddDays(-21) };

            db.ListColumns.AddRange(paTodo, paInProgress, paDone, mcBacklog, mcActive, mcCompleted, btNew, btInvestigating, btResolved);

            // --- Cards ---
            db.Cards.AddRange(
                // Project Alpha – To Do
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paTodo.ColumnID, Title = "Design database schema", Description = "Define tables, relationships, and indexes for the core domain model.", Position = 0, DueAtUTC = now.AddDays(5), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paTodo.ColumnID, Title = "Write API documentation", Description = "Document all REST endpoints with request/response examples using OpenAPI.", Position = 1, DueAtUTC = now.AddDays(7), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paTodo.ColumnID, Title = "Create user stories", Description = "Break down the product requirements into actionable user stories for the sprint.", Position = 2, DueAtUTC = now.AddDays(3), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paTodo.ColumnID, Title = "Set up error monitoring", Description = "Integrate Sentry or Application Insights for real-time error tracking and alerting.", Position = 3, DueAtUTC = now.AddDays(9), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paTodo.ColumnID, Title = "Add input validation", Description = "Add server-side validation to all API endpoints using FluentValidation.", Position = 4, DueAtUTC = now.AddDays(6), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paTodo.ColumnID, Title = "Write unit tests for services", Description = "Achieve 80% code coverage on AuthService, BoardService, and CardService.", Position = 5, DueAtUTC = now.AddDays(10), CreatedByUserID = alice.UserID },

                // Project Alpha – In Progress
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paInProgress.ColumnID, Title = "Implement authentication", Description = "Build JWT-based login and registration with refresh token support.", Position = 0, DueAtUTC = now.AddDays(2), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paInProgress.ColumnID, Title = "Build dashboard UI", Description = "Create the main dashboard view with board listing and navigation.", Position = 1, DueAtUTC = now.AddDays(4), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paInProgress.ColumnID, Title = "Implement drag-and-drop", Description = "Add drag-and-drop card reordering between columns using dnd-kit.", Position = 2, DueAtUTC = now.AddDays(5), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paInProgress.ColumnID, Title = "Set up SignalR notifications", Description = "Wire up real-time board update notifications so all members see changes live.", Position = 3, DueAtUTC = now.AddDays(3), CreatedByUserID = charlie.UserID },

                // Project Alpha – Done
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paDone.ColumnID, Title = "Set up project repository", Description = "Initialize the Git repo, configure branch policies, and add README.", Position = 0, DueAtUTC = now.AddDays(-7), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paDone.ColumnID, Title = "Configure CI/CD pipeline", Description = "Set up GitHub Actions for automated build, test, and deployment.", Position = 1, DueAtUTC = now.AddDays(-5), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paDone.ColumnID, Title = "Set up .NET Aspire orchestration", Description = "Configure AppHost to manage SQL Server, backend, and frontend services.", Position = 2, DueAtUTC = now.AddDays(-10), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = paDone.ColumnID, Title = "Create project scaffolding", Description = "Initialize solution structure with Backend, Frontend, AppHost, and ServiceDefaults.", Position = 3, DueAtUTC = now.AddDays(-12), CreatedByUserID = alice.UserID },

                // Marketing Campaign – Backlog
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcBacklog.ColumnID, Title = "Research target audience", Description = "Analyze demographics and user personas for the Q2 campaign.", Position = 0, DueAtUTC = now.AddDays(10), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcBacklog.ColumnID, Title = "Draft social media calendar", Description = "Plan posting schedule across Twitter, LinkedIn, and Instagram for April.", Position = 1, DueAtUTC = now.AddDays(12), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcBacklog.ColumnID, Title = "Create email newsletter template", Description = "Design a reusable HTML email template for monthly product updates.", Position = 2, DueAtUTC = now.AddDays(14), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcBacklog.ColumnID, Title = "Plan product demo webinar", Description = "Outline agenda, set up registration page, and prepare slide deck for live demo.", Position = 3, DueAtUTC = now.AddDays(18), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcBacklog.ColumnID, Title = "Competitor analysis report", Description = "Research and document feature comparisons with top 5 competing products.", Position = 4, DueAtUTC = now.AddDays(15), CreatedByUserID = charlie.UserID },

                // Marketing Campaign – Active
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcActive.ColumnID, Title = "Design landing page", Description = "Create a responsive landing page mockup for the product launch.", Position = 0, DueAtUTC = now.AddDays(6), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcActive.ColumnID, Title = "Write blog post series", Description = "Draft a 3-part blog series covering the product features and use cases.", Position = 1, DueAtUTC = now.AddDays(8), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcActive.ColumnID, Title = "Create promotional video script", Description = "Write a 60-second script for the product teaser video for social media.", Position = 2, DueAtUTC = now.AddDays(7), CreatedByUserID = bob.UserID },

                // Marketing Campaign – Completed
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcCompleted.ColumnID, Title = "Set up analytics tracking", Description = "Integrate Google Analytics and configure conversion event tracking.", Position = 0, DueAtUTC = now.AddDays(-3), CreatedByUserID = bob.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcCompleted.ColumnID, Title = "Brand guidelines document", Description = "Finalize color palette, typography, logo usage, and tone of voice guidelines.", Position = 1, DueAtUTC = now.AddDays(-8), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = mcCompleted.ColumnID, Title = "Set up social media accounts", Description = "Create and configure official accounts on Twitter, LinkedIn, and Instagram.", Position = 2, DueAtUTC = now.AddDays(-11), CreatedByUserID = bob.UserID },

                // Bug Tracker – New
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btNew.ColumnID, Title = "Login page 500 error on mobile", Description = "Users on iOS Safari report intermittent 500 errors when submitting the login form.", Position = 0, DueAtUTC = now.AddDays(1), CreatedByUserID = diana.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btNew.ColumnID, Title = "Slow query on reports page", Description = "The monthly reports endpoint takes over 8 seconds due to missing index on CreatedAtUTC.", Position = 1, DueAtUTC = now.AddDays(3), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btNew.ColumnID, Title = "Board name truncated in sidebar", Description = "Long board names overflow the sidebar container instead of truncating with ellipsis.", Position = 2, DueAtUTC = now.AddDays(5), CreatedByUserID = diana.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btNew.ColumnID, Title = "Duplicate notifications on card move", Description = "Moving a card between columns sends two SignalR notifications instead of one.", Position = 3, DueAtUTC = now.AddDays(4), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btNew.ColumnID, Title = "Dark mode colors inconsistent", Description = "Several components use hardcoded colors that don't respect the dark mode theme.", Position = 4, DueAtUTC = now.AddDays(8), CreatedByUserID = diana.UserID },

                // Bug Tracker – Investigating
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btInvestigating.ColumnID, Title = "Memory leak in background service", Description = "The TokenCleanupService appears to accumulate memory over time in production.", Position = 0, DueAtUTC = now.AddDays(2), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btInvestigating.ColumnID, Title = "CORS issue with API", Description = "Preflight requests are being rejected from the staging frontend domain.", Position = 1, DueAtUTC = now.AddDays(1), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btInvestigating.ColumnID, Title = "Refresh token rotation race condition", Description = "Concurrent API calls occasionally cause refresh token validation to fail for active sessions.", Position = 2, DueAtUTC = now.AddDays(2), CreatedByUserID = alice.UserID },

                // Bug Tracker – Resolved
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btResolved.ColumnID, Title = "Fix broken pagination", Description = "The card list pagination was returning duplicate items due to incorrect offset calculation.", Position = 0, DueAtUTC = now.AddDays(-4), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btResolved.ColumnID, Title = "Update expired SSL certificate", Description = "The production API SSL cert expired causing connection failures for all clients.", Position = 1, DueAtUTC = now.AddDays(-6), CreatedByUserID = alice.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btResolved.ColumnID, Title = "Fix card position after column delete", Description = "Deleting a column left orphaned position gaps causing rendering issues.", Position = 2, DueAtUTC = now.AddDays(-9), CreatedByUserID = charlie.UserID },
                new Card { CardID = Guid.NewGuid().ToString(), ColumnID = btResolved.ColumnID, Title = "SignalR reconnection loop", Description = "The frontend SignalR client was stuck in a reconnection loop after token expiry.", Position = 3, DueAtUTC = now.AddDays(-3), CreatedByUserID = alice.UserID }
            );

            db.SaveChanges();
        }
    }
}
