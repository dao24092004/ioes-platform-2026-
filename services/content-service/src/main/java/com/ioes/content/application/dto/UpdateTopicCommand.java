package com.ioes.content.application.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTopicCommand {

    @Size(min = 2, max = 255, message = "Topic name must be between 2 and 255 characters")
    private String name;

    private String description;

    private UUID parentTopicId;

    private Boolean isActive;
}
