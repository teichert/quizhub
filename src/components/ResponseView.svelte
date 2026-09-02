<script lang="ts">
    import type { ResponseQuestion } from '../quiz';
    // short answer, numerical and open response all answer by typing; the
    // question's inputMode picks the control
    export let question: ResponseQuestion;
</script>

<div class="response">
    {#if question.inputMode === 'essay'}
        <textarea rows="6" bind:value="{question.response}"></textarea>
    {:else}
        <input
            type="text"
            inputmode="{question.inputMode}"
            bind:value="{question.response}"
        />
    {/if}
</div>

<style>
    .response {
        padding: 0.5rem;
    }
    input,
    textarea {
        width: 100%;
        max-width: 24rem;
        font-size: medium;
        font-family: inherit;
        padding: 0.5rem;
        box-sizing: border-box;
        border: 2px solid
            color-mix(in srgb, var(--quizdown-color-primary) 30%, white 70%);
        border-radius: 4px;
    }
    input:focus,
    textarea:focus {
        outline: none;
        border-color: var(--quizdown-color-primary);
    }
</style>
