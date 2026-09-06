package com.ioes.content.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicResponse {

    private UUID id;
    private String name;
    private String slug;
    private String description;
    private UUID parentTopicId;
    private String parentTopicName;
    private Integer level;
    private String path;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
    private List<TopicResponse> children;
}
