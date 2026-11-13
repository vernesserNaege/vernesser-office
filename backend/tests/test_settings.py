from settings import think_value


def test_gpt_oss_can_never_turn_thinking_off():
    assert think_value("gpt-oss:20b", "off") == "low"
    assert think_value("gpt-oss:20b", "on") == "medium"
    assert think_value("gpt-oss:20b", "high") == "high"


def test_qwen_uses_on_and_off():
    assert think_value("qwen3:14b", "off") is False
    assert think_value("qwen3:14b", "on") is True


def test_other_models_get_no_think_setting():
    assert think_value("llama3.1:8b", "on") is None