package com.ioes.auth.domain.service;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserPage;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserSearchCriteria;
import com.ioes.auth.domain.model.UserSort;
import com.ioes.auth.domain.model.UserStats;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.domain.port.out.UserRepositoryPort;
import com.ioes.common.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepositoryPort userRepository;

    private AdminUserService service;

    private UUID adminId;
    private UUID targetId;

    @BeforeEach
    void setUp() {
        service = new AdminUserService(userRepository);
        adminId = UUID.randomUUID();
        targetId = UUID.randomUUID();
    }

    private static User user(UUID id, UserRole role, UserStatus status) {
        return User.builder()
                .id(id)
                .email(id + "@ioes.test")
                .fullName("User " + id)
                .role(role)
                .status(status)
                .build();
    }

    private void stubSave() {
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Nested
    @DisplayName("reads")
    class Reads {

        @Test
        @DisplayName("list hands the criteria straight to the repository")
        void listDelegates() {
            UserSearchCriteria criteria = new UserSearchCriteria(
                    "ngoc", UserRole.student, UserStatus.active, UserSort.name_asc, 2, 20);
            UserPage page = UserPage.of(List.of(user(targetId, UserRole.student, UserStatus.active)), 1, 2, 20);
            when(userRepository.search(criteria)).thenReturn(page);

            assertThat(service.list(criteria)).isSameAs(page);
        }

        @Test
        @DisplayName("stats comes from the repository tallies")
        void statsDelegates() {
            UserStats stats = new UserStats(9, 5, 2, 1, 1, 1, 2, 6);
            when(userRepository.stats()).thenReturn(stats);

            assertThat(service.stats()).isSameAs(stats);
        }

        @Test
        @DisplayName("an unknown id is a 404")
        void getByIdMissing() {
            when(userRepository.findById(targetId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getById(targetId))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("User not found");
        }

        @Test
        @DisplayName("a soft-deleted user reads as absent")
        void getByIdSoftDeleted() {
            User deleted = user(targetId, UserRole.student, UserStatus.deleted);
            deleted.setDeletedAt(Instant.now());
            when(userRepository.findById(targetId)).thenReturn(Optional.of(deleted));

            assertThatThrownBy(() -> service.getById(targetId))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("User not found");
        }
    }

    @Nested
    @DisplayName("updateStatus")
    class UpdateStatus {

        @Test
        @DisplayName("suspends the target")
        void suspends() {
            when(userRepository.findById(targetId))
                    .thenReturn(Optional.of(user(targetId, UserRole.student, UserStatus.active)));
            stubSave();

            User updated = service.updateStatus(adminId, targetId, UserStatus.suspended);

            assertThat(updated.getStatus()).isEqualTo(UserStatus.suspended);
        }

        @Test
        @DisplayName("refuses to delete through the status route")
        void refusesDeletedStatus() {
            assertThatThrownBy(() -> service.updateStatus(adminId, targetId, UserStatus.deleted))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("DELETE /users/{id}");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("an admin cannot suspend themselves")
        void refusesSelf() {
            assertThatThrownBy(() -> service.updateStatus(adminId, adminId, UserStatus.suspended))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("your own status");

            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("updateRole")
    class UpdateRole {

        @Test
        @DisplayName("an admin may move a student to instructor")
        void promotesToInstructor() {
            when(userRepository.findById(targetId))
                    .thenReturn(Optional.of(user(targetId, UserRole.student, UserStatus.active)));
            stubSave();

            User updated = service.updateRole(adminId, targetId, UserRole.instructor);

            assertThat(updated.getRole()).isEqualTo(UserRole.instructor);
        }

        @Test
        @DisplayName("an admin cannot re-role themselves")
        void refusesSelf() {
            assertThatThrownBy(() -> service.updateRole(adminId, adminId, UserRole.super_admin))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("your own role");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("a plain admin cannot mint a super_admin")
        void refusesPromotionToSuperAdminByAdmin() {
            when(userRepository.findById(targetId))
                    .thenReturn(Optional.of(user(targetId, UserRole.student, UserStatus.active)));
            when(userRepository.findById(adminId))
                    .thenReturn(Optional.of(user(adminId, UserRole.admin, UserStatus.active)));

            assertThatThrownBy(() -> service.updateRole(adminId, targetId, UserRole.super_admin))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("Only a super_admin");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("a plain admin cannot demote an existing super_admin")
        void refusesDemotionOfSuperAdminByAdmin() {
            when(userRepository.findById(targetId))
                    .thenReturn(Optional.of(user(targetId, UserRole.super_admin, UserStatus.active)));
            when(userRepository.findById(adminId))
                    .thenReturn(Optional.of(user(adminId, UserRole.admin, UserStatus.active)));

            assertThatThrownBy(() -> service.updateRole(adminId, targetId, UserRole.admin))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("Only a super_admin");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("a super_admin may mint another super_admin")
        void allowsPromotionBySuperAdmin() {
            when(userRepository.findById(targetId))
                    .thenReturn(Optional.of(user(targetId, UserRole.admin, UserStatus.active)));
            when(userRepository.findById(adminId))
                    .thenReturn(Optional.of(user(adminId, UserRole.super_admin, UserStatus.active)));
            stubSave();

            User updated = service.updateRole(adminId, targetId, UserRole.super_admin);

            assertThat(updated.getRole()).isEqualTo(UserRole.super_admin);
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("soft-deletes: status and deleted_at move together")
        void softDeletes() {
            when(userRepository.findById(targetId))
                    .thenReturn(Optional.of(user(targetId, UserRole.student, UserStatus.active)));
            stubSave();

            service.delete(adminId, targetId);

            ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(saved.capture());
            assertThat(saved.getValue().getStatus()).isEqualTo(UserStatus.deleted);
            assertThat(saved.getValue().getDeletedAt()).isNotNull();
        }

        @Test
        @DisplayName("an admin cannot delete themselves")
        void refusesSelf() {
            assertThatThrownBy(() -> service.delete(adminId, adminId))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("your own account");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("a plain admin cannot delete a super_admin")
        void refusesDeletingSuperAdmin() {
            when(userRepository.findById(targetId))
                    .thenReturn(Optional.of(user(targetId, UserRole.super_admin, UserStatus.active)));
            when(userRepository.findById(adminId))
                    .thenReturn(Optional.of(user(adminId, UserRole.admin, UserStatus.active)));

            assertThatThrownBy(() -> service.delete(adminId, targetId))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("Only a super_admin");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("deleting an already-deleted user is a 404, not a second delete")
        void refusesAlreadyDeleted() {
            User deleted = user(targetId, UserRole.student, UserStatus.deleted);
            deleted.setDeletedAt(Instant.now());
            when(userRepository.findById(targetId)).thenReturn(Optional.of(deleted));

            assertThatThrownBy(() -> service.delete(adminId, targetId))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("User not found");

            verify(userRepository, never()).save(any());
        }
    }
}
