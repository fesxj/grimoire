"""Tests for guess_category() in the library indexer."""
import pytest
from backend.indexer import guess_category


class TestKnownCategories:
    """Files in named subfolders that match predefined keywords."""

    def test_core_rulebook_folder(self):
        assert guess_category("books/D&D 5e/Core Rules/phb.pdf") == "core"

    def test_core_keyword_variant(self):
        assert guess_category("books/Pathfinder/Rulebook/crb.pdf") == "core"

    def test_supplement_folder(self):
        assert guess_category("books/D&D 5e/Supplements/xgte.pdf") == "supplement"

    def test_adventure_folder(self):
        assert guess_category("books/D&D 5e/Adventures/cos.pdf") == "adventure"

    def test_module_keyword(self):
        assert guess_category("books/OSR/Modules/tomb.pdf") == "adventure"

    def test_character_sheet_folder(self):
        assert guess_category("books/D&D 5e/Character Sheets/blank.pdf") == "character-sheet"

    def test_handout_folder(self):
        assert guess_category("books/D&D 5e/Handouts/ref.pdf") == "handout"

    def test_homebrew_folder(self):
        assert guess_category("books/D&D 5e/Homebrew/custom.pdf") == "homebrew"

    def test_map_folder(self):
        assert guess_category("books/D&D 5e/Maps/dungeon.pdf") == "map"

    def test_starter_set_folder(self):
        assert guess_category("books/D&D 5e/Starter Set/lost-mine.pdf") == "starter-set"

    def test_case_insensitive_matching(self):
        assert guess_category("books/D&D 5e/CORE RULEBOOKS/phb.pdf") == "core"

    def test_hyphen_space_equivalence(self):
        assert guess_category("books/D&D 5e/character-sheet/blank.pdf") == "character-sheet"


class TestCustomCategories:
    """Files in subfolders that don't match any predefined keyword."""

    def test_unrecognised_subfolder_becomes_custom_category(self):
        result = guess_category("books/D&D 5e/Lore & Fiction/novel.pdf")
        assert result == "lore-fiction"

    def test_custom_category_is_slugified(self):
        result = guess_category("books/Pathfinder/Bestiaries/monster.pdf")
        assert result == "bestiaries"

    def test_custom_category_strips_spaces(self):
        result = guess_category("books/Call of Cthulhu/Investigator Aids/handout.pdf")
        assert result == "investigator-aids"

    def test_custom_category_uppercase_slugified(self):
        result = guess_category("books/Vampire/LORE FICTION/vtm.pdf")
        assert result == "lore-fiction"

    def test_deep_nesting_uses_first_subfolder(self):
        # Only the first subfolder under the system name is used
        result = guess_category("books/D&D 5e/Lore/Forgotten Realms/sword-coast.pdf")
        assert result == "lore"


class TestNoSubfolder:
    """Files placed directly in the system folder default to 'core'."""

    def test_file_directly_in_system_folder(self):
        assert guess_category("books/D&D 5e/phb.pdf") == "core"

    def test_single_segment_path(self):
        # Degenerate case — still returns 'core'
        assert guess_category("phb.pdf") == "core"
