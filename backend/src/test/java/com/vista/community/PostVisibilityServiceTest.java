package com.vista.community;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vista.community.application.PostVisibilityNotImplementedException;
import com.vista.community.application.PostVisibilityService;
import com.vista.community.application.StubPostVisibilityService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class PostVisibilityServiceTest {
  private final ApplicationContextRunner runner =
      new ApplicationContextRunner().withUserConfiguration(StubPostVisibilityService.class);

  @Test
  void optInDevelopmentStubNeverClaimsSuccess() {
    runner
        .withPropertyValues(
            "spring.profiles.active=dev", "vista.community.visibility-stub.enabled=true")
        .run(
            context -> {
              assertThat(context).hasSingleBean(PostVisibilityService.class);
              var service = context.getBean(PostVisibilityService.class);
              var postId = UUID.randomUUID();
              var actorId = UUID.randomUUID();
              assertThatThrownBy(() -> service.hide(postId, actorId, 0))
                  .isInstanceOf(PostVisibilityNotImplementedException.class)
                  .hasMessageContaining("not persisted");
              assertThatThrownBy(() -> service.restore(postId, actorId, 0))
                  .isInstanceOf(PostVisibilityNotImplementedException.class);
              assertThatThrownBy(() -> service.hide(postId, actorId, -1))
                  .isInstanceOf(IllegalArgumentException.class);
              assertThatThrownBy(() -> service.restore(null, actorId, 0))
                  .isInstanceOf(NullPointerException.class);
            });
  }

  @Test
  void stubRequiresBothOptInAndDevelopmentProfile() {
    for (String profile : new String[] {"prod", "demo", "dev,prod", "test,prod", "dev,demo"}) {
      runner
          .withPropertyValues(
              "spring.profiles.active=" + profile, "vista.community.visibility-stub.enabled=true")
          .run(context -> assertThat(context).doesNotHaveBean(PostVisibilityService.class));
    }
    runner
        .withPropertyValues("spring.profiles.active=dev")
        .run(context -> assertThat(context).doesNotHaveBean(PostVisibilityService.class));
    runner
        .withPropertyValues("vista.community.visibility-stub.enabled=true")
        .run(context -> assertThat(context).doesNotHaveBean(PostVisibilityService.class));
    runner
        .withPropertyValues(
            "spring.profiles.active=test", "vista.community.visibility-stub.enabled=true")
        .run(context -> assertThat(context).hasSingleBean(PostVisibilityService.class));
  }
}
